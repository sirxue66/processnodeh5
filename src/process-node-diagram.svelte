<svelte:options tag='process-node-diagram'></svelte:options>
<script>
    /**
     * @author: Xcc
     * @description: 流程节点图 
     */
    export let nodelist = [], w = 1000, nodewidth = 160, iconwidth = 20, iconcolor = '#1890ff', rowspacing = 3
    nodelist = stringToArray(nodelist)
    import {createEventDispatcher} from "svelte"
    let {itemW = 120, endList = []} = handleNodeList(nodelist)
    $: {
        nodelist = stringToArray(nodelist)
        itemW = handleNodeList(nodelist).itemW;
        endList = handleNodeList(nodelist).endList;
    }

    function handleNodeList(list){
        if(list.length <= 0) return {itemW: 120, endList: []}
        const rowCount = Math.floor(w / nodewidth)
        const rows = Math.ceil(list.length / rowCount)
        const itemW = Math.floor(w / rowCount) - iconwidth
        const endList = []
        for(let i = 0; i < rows; i++){
            let child = list.slice(i*rowCount, (i+1)*rowCount)
            const isEnd = (i === rows - 1)
            if(i % 2 === 0){
                child.forEach(item => {
                    item.direction = "right";
                })
                child[child.length-1].direction = 'down'
                isEnd && (child[child.length-1].direction = '')
                endList.push(child)
            } else {
                child = child.reverse()
                child.forEach(item => {
                    item.direction = "left";
                })
                child[0].direction = 'down'
                isEnd && (child[0].direction = '')
                endList.push(child)
            }
        }
        return {
            itemW,
            endList
        }
    }

    function stringToArray(list){
        if(Object.prototype.toString.call(list) === "[object String]"){
            return JSON.parse(list)
        } else return list
    }

    const dispatch = createEventDispatcher()
    function nodeClick(item){
        // dispatch("node-click-event")
        const event = createEvent("node-click-event", item)
        window.dispatchEvent(event)
    }

    function createEvent(name, e) {
      const event = new CustomEvent(name, {
        detail: e,
        bubbles: true,
        cancelable: true,
        composed: true, // 事件是否会触发shadow DOM（阴影DOM）根节点之外的事件监听器
      });
      return event;
    }

</script>

    <div class="container" style="width: {w}px;">
        {#each endList as item, index (index)}
        <ul style="{index % 2 === 0 ? `justify-content: flex-start;margin-bottom:${rowspacing}px;` : `justify-content: flex-end;padding-right:${Number(iconwidth) + 3}px;margin-bottom:${rowspacing}px;` }">
            {#each item as citem, cindex (cindex)}
                <li>
                    {#if citem.direction === 'left'}
                        <div>
                            <svg t="1681105402401" 
                            class="icon deforeIcon" 
                            viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3930"
                            width={iconwidth}>
                                <path d="M552.18 353.31H65.583v325.46H552.18v183.778L960.744 512.06 552.18 161.576V353.31z m0 0" 
                                fill={iconcolor} p-id="3931"></path>
                            </svg>
                        </div>
                    {/if}
                    <div>
                        <div style="min-width: {itemW}px;" class="nodeBody">
                            <slot {...citem}>
                                <button style="{citem.disabled ? 'color:#999999' : ''}" on:click={nodeClick(citem)}>{citem.nodename}</button>
                            </slot>
                        </div>
                        {#if citem.direction === 'down'}
                            <svg t="1681105402401" 
                            class="icon downIcon" 
                            viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3930"
                            width={iconwidth}>
                                <path d="M552.18 353.31H65.583v325.46H552.18v183.778L960.744 512.06 552.18 161.576V353.31z m0 0" 
                                fill={iconcolor} p-id="3931"></path>
                            </svg>
                        {/if}
                    </div>
                    {#if citem.direction === 'right'}
                        <div>
                            <svg t="1681105402401" 
                            class="icon afterIcon" 
                            viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3930"
                            width={iconwidth}>
                                <path d="M552.18 353.31H65.583v325.46H552.18v183.778L960.744 512.06 552.18 161.576V353.31z m0 0" 
                                fill={iconcolor} p-id="3931"></path>
                            </svg>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
        {/each}
    </div>

<style>
*{
    padding: 0;
    margin: 0;
    box-sizing: border-box;
}
.container{
    position: relative;
    overflow: hidden;
}
ul{
    list-style: none;
    position: relative;
    display: flex;
    flex-wrap:nowrap
}
li{
    list-style: none;
    position: relative;
    display: flex;
}
button{
    padding: 0 10px;
    line-height: 26px;
    font-size: 16px;
    text-align: center;
    background: #fafafa;
    border: 1px solid #eaebf3;
    cursor: pointer;
    width: 100%;
    height: 100%;
}
.nodeBody{
    padding: 0;
    margin: 0;
    position: relative;
    line-height: 26px;
    font-size: 16px;
    text-align: center;
}
.icon{
    position: relative;
    display: block;
    margin: 0 auto;
    height: 18px;
    max-height: 24px;
    margin-top: 4px;
}
.deforeIcon{
    transform: rotate(180deg);
}
.downIcon{
    transform: rotate(90deg);
}
</style>