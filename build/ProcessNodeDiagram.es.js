function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (key === '__value') {
            node.value = node[key] = attributes[key];
        }
        else if (descriptors[key] && descriptors[key].set) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    text.data = data;
}
function set_style(node, key, value, important) {
    if (value === null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}
function attribute_to_object(attributes) {
    const result = {};
    for (const attribute of attributes) {
        result[attribute.name] = attribute.value;
    }
    return result;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
/**
 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
 */
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail, { cancelable = false } = {}) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail, { cancelable });
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
            return !event.defaultPrevented;
        }
        return true;
    };
}

const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    // Do not reenter flush while dirty components are updated, as this can
    // result in an infinite loop. Instead, let the inner flush handle it.
    // Reentrancy is ok afterwards for bindings etc.
    if (flushidx !== 0) {
        return;
    }
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        try {
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
        }
        catch (e) {
            // reset dirty state to not end up in a deadlocked state and then rethrow
            dirty_components.length = 0;
            flushidx = 0;
            throw e;
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 */
function flush_render_callbacks(fns) {
    const filtered = [];
    const targets = [];
    render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
    targets.forEach((c) => c());
    render_callbacks = filtered;
}
const outroing = new Set();
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}

function destroy_block(block, lookup) {
    block.d(1);
    lookup.delete(block.key);
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
    let o = old_blocks.length;
    let n = list.length;
    let i = o;
    const old_indexes = {};
    while (i--)
        old_indexes[old_blocks[i].key] = i;
    const new_blocks = [];
    const new_lookup = new Map();
    const deltas = new Map();
    const updates = [];
    i = n;
    while (i--) {
        const child_ctx = get_context(ctx, list, i);
        const key = get_key(child_ctx);
        let block = lookup.get(key);
        if (!block) {
            block = create_each_block(key, child_ctx);
            block.c();
        }
        else if (dynamic) {
            // defer updates until all the DOM shuffling is done
            updates.push(() => block.p(child_ctx, dirty));
        }
        new_lookup.set(key, new_blocks[i] = block);
        if (key in old_indexes)
            deltas.set(key, Math.abs(i - old_indexes[key]));
    }
    const will_move = new Set();
    const did_move = new Set();
    function insert(block) {
        transition_in(block, 1);
        block.m(node, next);
        lookup.set(block.key, block);
        next = block.first;
        n--;
    }
    while (o && n) {
        const new_block = new_blocks[n - 1];
        const old_block = old_blocks[o - 1];
        const new_key = new_block.key;
        const old_key = old_block.key;
        if (new_block === old_block) {
            // do nothing
            next = new_block.first;
            o--;
            n--;
        }
        else if (!new_lookup.has(old_key)) {
            // remove old block
            destroy(old_block, lookup);
            o--;
        }
        else if (!lookup.has(new_key) || will_move.has(new_key)) {
            insert(new_block);
        }
        else if (did_move.has(old_key)) {
            o--;
        }
        else if (deltas.get(new_key) > deltas.get(old_key)) {
            did_move.add(new_key);
            insert(new_block);
        }
        else {
            will_move.add(old_key);
            o--;
        }
    }
    while (o--) {
        const old_block = old_blocks[o];
        if (!new_lookup.has(old_block.key))
            destroy(old_block, lookup);
    }
    while (n)
        insert(new_blocks[n - 1]);
    run_all(updates);
    return new_blocks;
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
            // if the component was destroyed immediately
            // it will update the `$$.on_destroy` reference to `null`.
            // the destructured on_destroy may still reference to the old array
            if (component.$$.on_destroy) {
                component.$$.on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        flush_render_callbacks($$.after_update);
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: [],
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
let SvelteElement;
if (typeof HTMLElement === 'function') {
    SvelteElement = class extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
            const { on_mount } = this.$$;
            this.$$.on_disconnect = on_mount.map(run).filter(is_function);
            // @ts-ignore todo: improve typings
            for (const key in this.$$.slotted) {
                // @ts-ignore todo: improve typings
                this.appendChild(this.$$.slotted[key]);
            }
        }
        attributeChangedCallback(attr, _oldValue, newValue) {
            this[attr] = newValue;
        }
        disconnectedCallback() {
            run_all(this.$$.on_disconnect);
        }
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            // TODO should this delegate to addEventListener?
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    };
}

/* src\process-node-diagram.svelte generated by Svelte v3.58.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[10] = list[i];
	child_ctx[12] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[13] = list[i];
	child_ctx[15] = i;
	return child_ctx;
}

// (75:20) {#if citem.direction === 'left'}
function create_if_block_2(ctx) {
	let div;
	let svg;
	let path;

	return {
		c() {
			div = element("div");
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "d", "M552.18 353.31H65.583v325.46H552.18v183.778L960.744 512.06 552.18 161.576V353.31z m0 0");
			attr(path, "fill", /*iconcolor*/ ctx[2]);
			attr(path, "p-id", "3931");
			attr(svg, "t", "1681105402401");
			attr(svg, "class", "icon deforeIcon");
			attr(svg, "viewBox", "0 0 1024 1024");
			attr(svg, "version", "1.1");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "p-id", "3930");
			attr(svg, "width", /*iconwidth*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, svg);
			append(svg, path);
		},
		p(ctx, dirty) {
			if (dirty & /*iconcolor*/ 4) {
				attr(path, "fill", /*iconcolor*/ ctx[2]);
			}

			if (dirty & /*iconwidth*/ 2) {
				attr(svg, "width", /*iconwidth*/ ctx[1]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (92:24) {#if citem.direction === 'down'}
function create_if_block_1(ctx) {
	let svg;
	let path;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "d", "M552.18 353.31H65.583v325.46H552.18v183.778L960.744 512.06 552.18 161.576V353.31z m0 0");
			attr(path, "fill", /*iconcolor*/ ctx[2]);
			attr(path, "p-id", "3931");
			attr(svg, "t", "1681105402401");
			attr(svg, "class", "icon downIcon");
			attr(svg, "viewBox", "0 0 1024 1024");
			attr(svg, "version", "1.1");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "p-id", "3930");
			attr(svg, "width", /*iconwidth*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
		},
		p(ctx, dirty) {
			if (dirty & /*iconcolor*/ 4) {
				attr(path, "fill", /*iconcolor*/ ctx[2]);
			}

			if (dirty & /*iconwidth*/ 2) {
				attr(svg, "width", /*iconwidth*/ ctx[1]);
			}
		},
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

// (102:20) {#if citem.direction === 'right'}
function create_if_block(ctx) {
	let div;
	let svg;
	let path;

	return {
		c() {
			div = element("div");
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "d", "M552.18 353.31H65.583v325.46H552.18v183.778L960.744 512.06 552.18 161.576V353.31z m0 0");
			attr(path, "fill", /*iconcolor*/ ctx[2]);
			attr(path, "p-id", "3931");
			attr(svg, "t", "1681105402401");
			attr(svg, "class", "icon afterIcon");
			attr(svg, "viewBox", "0 0 1024 1024");
			attr(svg, "version", "1.1");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "p-id", "3930");
			attr(svg, "width", /*iconwidth*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, svg);
			append(svg, path);
		},
		p(ctx, dirty) {
			if (dirty & /*iconcolor*/ 4) {
				attr(path, "fill", /*iconcolor*/ ctx[2]);
			}

			if (dirty & /*iconwidth*/ 2) {
				attr(svg, "width", /*iconwidth*/ ctx[1]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (73:12) {#each item as citem, cindex (cindex)}
function create_each_block_1(key_1, ctx) {
	let li;
	let t0;
	let div1;
	let div0;
	let slot;
	let button;
	let t1_value = /*citem*/ ctx[13].nodename + "";
	let t1;
	let t2;
	let t3;
	let mounted;
	let dispose;
	let if_block0 = /*citem*/ ctx[13].direction === 'left' && create_if_block_2(ctx);
	let slot_levels = [/*citem*/ ctx[13]];
	let slot_data = {};

	for (let i = 0; i < slot_levels.length; i += 1) {
		slot_data = assign(slot_data, slot_levels[i]);
	}

	let if_block1 = /*citem*/ ctx[13].direction === 'down' && create_if_block_1(ctx);
	let if_block2 = /*citem*/ ctx[13].direction === 'right' && create_if_block(ctx);

	return {
		key: key_1,
		first: null,
		c() {
			li = element("li");
			if (if_block0) if_block0.c();
			t0 = space();
			div1 = element("div");
			div0 = element("div");
			slot = element("slot");
			button = element("button");
			t1 = text(t1_value);
			t2 = space();
			if (if_block1) if_block1.c();
			t3 = space();
			if (if_block2) if_block2.c();
			set_attributes(slot, slot_data);
			set_style(div0, "min-width", /*itemW*/ ctx[4] + "px");
			attr(div0, "class", "nodeBody");
			this.first = li;
		},
		m(target, anchor) {
			insert(target, li, anchor);
			if (if_block0) if_block0.m(li, null);
			append(li, t0);
			append(li, div1);
			append(div1, div0);
			append(div0, slot);
			append(slot, button);
			append(button, t1);
			append(div1, t2);
			if (if_block1) if_block1.m(div1, null);
			append(li, t3);
			if (if_block2) if_block2.m(li, null);

			if (!mounted) {
				dispose = listen(button, "click", function () {
					if (is_function(nodeClick(/*citem*/ ctx[13]))) nodeClick(/*citem*/ ctx[13]).apply(this, arguments);
				});

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (/*citem*/ ctx[13].direction === 'left') {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_2(ctx);
					if_block0.c();
					if_block0.m(li, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (dirty & /*endList*/ 32 && t1_value !== (t1_value = /*citem*/ ctx[13].nodename + "")) set_data(t1, t1_value);
			set_attributes(slot, slot_data = get_spread_update(slot_levels, [dirty & /*endList*/ 32 && /*citem*/ ctx[13]]));

			if (dirty & /*itemW*/ 16) {
				set_style(div0, "min-width", /*itemW*/ ctx[4] + "px");
			}

			if (/*citem*/ ctx[13].direction === 'down') {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_1(ctx);
					if_block1.c();
					if_block1.m(div1, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*citem*/ ctx[13].direction === 'right') {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block(ctx);
					if_block2.c();
					if_block2.m(li, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}
		},
		d(detaching) {
			if (detaching) detach(li);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			mounted = false;
			dispose();
		}
	};
}

// (71:8) {#each endList as item, index (index)}
function create_each_block(key_1, ctx) {
	let ul;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let t;
	let ul_style_value;
	let each_value_1 = /*item*/ ctx[10];
	const get_key = ctx => /*cindex*/ ctx[15];

	for (let i = 0; i < each_value_1.length; i += 1) {
		let child_ctx = get_each_context_1(ctx, each_value_1, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
	}

	return {
		key: key_1,
		first: null,
		c() {
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();

			attr(ul, "style", ul_style_value = /*index*/ ctx[12] / 2 === 0
			? `justify-content: flex-start;margin-bottom:${/*rowspacing*/ ctx[3]}px;`
			: `justify-content: flex-end;padding-right:${/*iconwidth*/ ctx[1]}px;margin-bottom:${/*rowspacing*/ ctx[3]}px;`);

			this.first = ul;
		},
		m(target, anchor) {
			insert(target, ul, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(ul, null);
				}
			}

			append(ul, t);
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty & /*iconwidth, iconcolor, endList, itemW, nodeClick*/ 54) {
				each_value_1 = /*item*/ ctx[10];
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, ul, destroy_block, create_each_block_1, t, get_each_context_1);
			}

			if (dirty & /*endList, rowspacing, iconwidth*/ 42 && ul_style_value !== (ul_style_value = /*index*/ ctx[12] / 2 === 0
			? `justify-content: flex-start;margin-bottom:${/*rowspacing*/ ctx[3]}px;`
			: `justify-content: flex-end;padding-right:${/*iconwidth*/ ctx[1]}px;margin-bottom:${/*rowspacing*/ ctx[3]}px;`)) {
				attr(ul, "style", ul_style_value);
			}
		},
		d(detaching) {
			if (detaching) detach(ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};
}

function create_fragment(ctx) {
	let div;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_value = /*endList*/ ctx[5];
	const get_key = ctx => /*index*/ ctx[12];

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			this.c = noop;
			attr(div, "class", "container");
			set_style(div, "width", /*w*/ ctx[0] + "px");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*endList, rowspacing, iconwidth, iconcolor, itemW, nodeClick*/ 62) {
				each_value = /*endList*/ ctx[5];
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, destroy_block, create_each_block, null, get_each_context);
			}

			if (dirty & /*w*/ 1) {
				set_style(div, "width", /*w*/ ctx[0] + "px");
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};
}

function stringToArray(list) {
	if (Object.prototype.toString.call(list) === "[object String]") {
		return JSON.parse(list);
	} else return list;
}

function nodeClick(item) {
	// dispatch("node-click-event")
	const event = createEvent("node-click-event", item);

	window.dispatchEvent(event);
}

function createEvent(name, e) {
	const event = new CustomEvent(name,
	{
			detail: e,
			bubbles: true,
			cancelable: true,
			composed: true, // 事件是否会触发shadow DOM（阴影DOM）根节点之外的事件监听器
			
		});

	return event;
}

function instance($$self, $$props, $$invalidate) {
	let { nodelist = [], w = 1000, nodewidth = 160, iconwidth = 20, iconcolor = '#1890ff', rowspacing = 3 } = $$props;
	nodelist = stringToArray(nodelist);
	let { itemW = 120, endList = [] } = handleNodeList(nodelist);

	function handleNodeList(list) {
		if (list.length <= 0) return { itemW: 120, endList: [] };
		const rowCount = Math.floor(w / nodewidth);
		const rows = Math.ceil(list.length / rowCount);
		const itemW = Math.floor(w / rowCount) - iconwidth;
		const endList = [];

		for (let i = 0; i < rows; i++) {
			let child = list.slice(i * rowCount, (i + 1) * rowCount);
			const isEnd = i === rows - 1;

			if (i % 2 === 0) {
				child.forEach(item => {
					item.direction = "right";
				});

				child[child.length - 1].direction = 'down';
				isEnd && (child[child.length - 1].direction = '');
				endList.push(child);
			} else {
				child = child.reverse();

				child.forEach(item => {
					item.direction = "left";
				});

				child[0].direction = 'down';
				isEnd && (child[0].direction = '');
				endList.push(child);
			}
		}

		return { itemW, endList };
	}

	createEventDispatcher();

	$$self.$$set = $$props => {
		if ('nodelist' in $$props) $$invalidate(6, nodelist = $$props.nodelist);
		if ('w' in $$props) $$invalidate(0, w = $$props.w);
		if ('nodewidth' in $$props) $$invalidate(7, nodewidth = $$props.nodewidth);
		if ('iconwidth' in $$props) $$invalidate(1, iconwidth = $$props.iconwidth);
		if ('iconcolor' in $$props) $$invalidate(2, iconcolor = $$props.iconcolor);
		if ('rowspacing' in $$props) $$invalidate(3, rowspacing = $$props.rowspacing);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*nodelist*/ 64) {
			{
				$$invalidate(6, nodelist = stringToArray(nodelist));
				$$invalidate(4, itemW = handleNodeList(nodelist).itemW);
				$$invalidate(5, endList = handleNodeList(nodelist).endList);
			}
		}
	};

	return [w, iconwidth, iconcolor, rowspacing, itemW, endList, nodelist, nodewidth];
}

class Process_node_diagram extends SvelteElement {
	constructor(options) {
		super();
		const style = document.createElement('style');

		style.textContent = `*{padding:0;margin:0;box-sizing:border-box}.container{position:relative;overflow:hidden}ul{list-style:none;position:relative;display:flex;flex-wrap:nowrap
}li{list-style:none;position:relative;display:flex}button{padding:0 10px;line-height:26px;font-size:16px;text-align:center;background:#fafafa;border:1px solid #eaebf3;cursor:pointer;width:100%;height:100%}.nodeBody{padding:0;margin:0;position:relative;line-height:26px;font-size:16px;text-align:center}.icon{position:relative;display:block;margin:0 auto;height:18px;max-height:24px;margin-top:4px}.deforeIcon{transform:rotate(180deg)}.downIcon{transform:rotate(90deg)}`;

		this.shadowRoot.appendChild(style);

		init(
			this,
			{
				target: this.shadowRoot,
				props: attribute_to_object(this.attributes),
				customElement: true
			},
			instance,
			create_fragment,
			safe_not_equal,
			{
				nodelist: 6,
				w: 0,
				nodewidth: 7,
				iconwidth: 1,
				iconcolor: 2,
				rowspacing: 3
			},
			null
		);

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return ["nodelist", "w", "nodewidth", "iconwidth", "iconcolor", "rowspacing"];
	}

	get nodelist() {
		return this.$$.ctx[6];
	}

	set nodelist(nodelist) {
		this.$$set({ nodelist });
		flush();
	}

	get w() {
		return this.$$.ctx[0];
	}

	set w(w) {
		this.$$set({ w });
		flush();
	}

	get nodewidth() {
		return this.$$.ctx[7];
	}

	set nodewidth(nodewidth) {
		this.$$set({ nodewidth });
		flush();
	}

	get iconwidth() {
		return this.$$.ctx[1];
	}

	set iconwidth(iconwidth) {
		this.$$set({ iconwidth });
		flush();
	}

	get iconcolor() {
		return this.$$.ctx[2];
	}

	set iconcolor(iconcolor) {
		this.$$set({ iconcolor });
		flush();
	}

	get rowspacing() {
		return this.$$.ctx[3];
	}

	set rowspacing(rowspacing) {
		this.$$set({ rowspacing });
		flush();
	}
}

customElements.define("process-node-diagram", Process_node_diagram);
