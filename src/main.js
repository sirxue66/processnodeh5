// import App from './App.svelte';

// const app = new App({
// 	target: document.body,
// 	props: {
// 		name: 'world'
// 	}
// });

// export default app;

import ProcessNodeDiagram from './process-node-diagram.svelte'
const app = new ProcessNodeDiagram({
	target: document.body,
	props: {
		nodelist: [
			{
				nodename: '节点一',
				id: 1
			},
			{
				nodename: '节点二',
				id: 2
			},
			{
				nodename: '节点三',
				id: 3
			},
			{
				nodename: '节点四',
				id: 4
			},
			{
				nodename: '节点五',
				id: 5
			},
			{
				nodename: '节点六',
				id: 6
			},
			{
				nodename: '节点七',
				id: 7
			},
			{
				nodename: '节点八',
				id: 8
			},
			{
				nodename: '节点九',
				id: 9
			}
		]
	}
})

export default app