# 欢迎使用 processnodeh5 （web Component组件）

**processnodeh5 是使用Svelte开发，rollup打包打出来的web Component组件**
**是一款 节点流转图，功能简单，所以场景受限，适合做一些有顺序节点的展示需要**

## processnodeh5 仓库和预览

[git地址](http://localhost/)

[预览地址](http://localhost/ "普通链接带标题")


## props

| props             | 解释                  | type      |   默认值     | 是否必须      |
| -------------     | -------------         | --------- | ----------- | -------------|
| nodelist          | 节点流程数组          | string    | []          | 否            |
| w                 |   流程图整体宽度      | string    | 1000         | 否           |
| nodewidth         | 单个节点+箭头icon的宽度 | string  | 160           |  否          |
| iconwidth         | 单个箭头icon的宽度    | string    | 20            | 否           |
| iconcolor         | 箭头的颜色            | string    | #1890ff       | 否           |
| rowspacing        | 两行节点间的间隙       | string   | 3              | 否           |

####**nodelist要求**
**nodelist数组中每一项应该包含两个字段 name 和 nodename；**
**nodename: 节点显示的名称字段**
**name: 如果节点使用插槽替换，每个节点的插槽名称就是该项数据的name字段，并且每项数据的name字段应该保持唯一**

## slot
**每个节点的插槽name就是该项数据的name字段所指定的**
**所以完全可以自定义的使用slot循环节点，而不必理会排序和显示的问题**
**例如vue中**
```html
<body>
    <process-node-diagram>
			<button v-for="item in nodeList" :key="item.id" :slot="item.name">{{item.nodename}}</button>
	</process-node-diagram>
</body>
```

## event  -->  node-click-event
**组件的自定义事件为了兼容性是绑定在window上，所以可以使用事件监听来监听节点的点击事件**
**例如**
```js
window.addEventListener('node-click-event', function(e){
		console.log(e.detail)
	}, false)
```

#### 使用示例

**使用es包**
```javascript
<body>
    <process-node-diagram>
			<button slot="node-1">你好</button>
	</process-node-diagram>
</body>
<script src="../build/ProcessNodeDiagram.es.js"></script>
<script>
    const nodeList = [
			{
				name: 'node-1',
				nodename: '节点一',
				id: 1
			},
			{
				name: 'node-2',
				nodename: '节点二',
				id: 2
			},
			{
				name: 'node-3',
				nodename: '节点三',
				id: 3
			},
			{
				name: 'node-4',
				nodename: '节点四',
				id: 4
			},
			{
				name: 'node-5',
				nodename: '节点五',
				id: 5
			},
			{
				name: 'node-6',
				nodename: '节点六',
				id: 6
			},
			{
				name: 'node-7',
				nodename: '节点七',
				id: 7
			},
			{
				name: 'node-8',
				nodename: '节点八',
				id: 8
			},
			{
				name: 'node-9',
				nodename: '节点九',
				id: 9
			}
		]
	// 由于原生无法绑定数组，所以可以使用js手动将数组转换成字符串进行绑定
	document.querySelector('process-node-diagram').setAttribute('nodelist', JSON.stringify(nodeList))

	window.addEventListener('node-click-event', function(e){
	// 节点数据
		console.log(e.detail)
	}, false)
</script>

```

**使用umd包（即npm包）**
```javascript
<script setup lang="ts">
import "processnodeh5"
const nodeList = [
			{
				name: 'node-1',
				nodename: '节点一',
				id: 1
			},
			{
				name: 'node-2',
				nodename: '节点二',
				id: 2
			},
			{
				name: 'node-3',
				nodename: '节点三',
				id: 3
			},
			{
				name: 'node-4',
				nodename: '节点四',
				id: 4
			},
			{
				name: 'node-5',
				nodename: '节点五',
				id: 5
			},
			{
				name: 'node-6',
				nodename: '节点六',
				id: 6
			},
			{
				name: 'node-7',
				nodename: '节点七',
				id: 7
			},
			{
				name: 'node-8',
				nodename: '节点八',
				id: 8
			},
			{
				name: 'node-9',
				nodename: '节点九',
				id: 9
			}
		]
// 模拟请求数据
setTimeout(() => {
  document.querySelector('process-node-diagram')?.setAttribute('nodelist', JSON.stringify(nodeList))
}, 1000)

window.addEventListener('node-click-event', function(e:any){
		console.log(e.detail)
	}, false)
</script>

<template>
  <process-node-diagram></process-node-diagram>
</template>

```


