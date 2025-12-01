'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { TreeView, TreeDataItem } from '@/components/tree-view'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "@/components/ui/dialog"
import {
   FileJson,
   Folder,
   FolderOpen,
   Type,
   Hash,
   ToggleLeft,
   List,
   MoreHorizontal,
   Plus,
   Trash,
   Edit2
} from 'lucide-react'
import _ from 'lodash'
import { cn } from '@/lib/utils'

const initialJson = {
   "name": "Crimson Voyager",
   "version": "1.0.0",
   "features": ["json-editor", "tree-view", "shadcn-ui"],
   "settings": {
      "theme": "dark",
      "notifications": true,
      "retryCount": 3
   }
}

export default function JsonEditor() {
   const [jsonString, setJsonString] = useState(JSON.stringify(initialJson, null, 2))
   const [jsonData, setJsonData] = useState<any>(initialJson)
   const [error, setError] = useState<string | null>(null)
   const [treeData, setTreeData] = useState<TreeDataItem[]>([])

   // Edit Dialog State
   const [isDialogOpen, setIsDialogOpen] = useState(false)
   const [editingNode, setEditingNode] = useState<TreeDataItem | null>(null)
   const [editKey, setEditKey] = useState('')
   const [editValue, setEditValue] = useState('')
   const [editType, setEditType] = useState('string')
   const [isAdding, setIsAdding] = useState(false)
   const [parentNode, setParentNode] = useState<TreeDataItem | null>(null)

   const parseJson = useCallback((str: string) => {
      try {
         const parsed = JSON.parse(str)
         setJsonData(parsed)
         setError(null)
         return parsed
      } catch (e: any) {
         setError(e.message)
         return null
      }
   }, [])

   const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const str = e.target.value
      setJsonString(str)
      parseJson(str)
   }

   const getType = (value: any) => {
      if (Array.isArray(value)) return 'array'
      if (value === null) return 'null'
      return typeof value
   }

   const getIcon = (type: string) => {
      switch (type) {
         case 'object': return Folder
         case 'array': return List
         case 'string': return Type
         case 'number': return Hash
         case 'boolean': return ToggleLeft
         default: return FileJson
      }
   }

   const handleDelete = (node: TreeDataItem) => {
      const path = node.id.split('.')
      // If root
      if (path.length === 1 && path[0] === 'root') {
         // Cannot delete root? Or clear it?
         return
      }

      const newJson = _.cloneDeep(jsonData)

      // We need to find the parent and remove the key/index
      // The id is like "root.key.subkey"
      // But wait, my id generation needs to be consistent.
      // Let's assume id is the path.

      // Remove 'root.' prefix for lodash path
      const lodashPath = path.slice(1).join('.')

      if (!lodashPath) return // Root

      // Use _.unset? It works for objects, for arrays it leaves undefined.
      // For arrays we need to splice.

      const parentPath = path.slice(1, -1).join('.')
      const key = path[path.length - 1]

      if (parentPath === '') {
         // Top level property
         if (Array.isArray(newJson)) {
            newJson.splice(parseInt(key), 1)
         } else {
            delete newJson[key]
         }
      } else {
         const parent = _.get(newJson, parentPath)
         if (Array.isArray(parent)) {
            parent.splice(parseInt(key), 1)
         } else {
            delete parent[key]
         }
      }

      setJsonData(newJson)
      setJsonString(JSON.stringify(newJson, null, 2))
   }

   const handleEdit = (node: TreeDataItem) => {
      setEditingNode(node)
      setEditKey(node.name)
      setEditValue(String(node.value))
      setEditType(node.type || 'string')
      setIsAdding(false)
      setIsDialogOpen(true)
   }

   const handleAdd = (node: TreeDataItem) => {
      setParentNode(node)
      setEditKey('')
      setEditValue('')
      setEditType('string')
      setIsAdding(true)
      setIsDialogOpen(true)
   }

   const saveEdit = () => {
      const newJson = _.cloneDeep(jsonData)
      let val: any = editValue

      if (editType === 'number') val = Number(editValue)
      if (editType === 'boolean') val = editValue === 'true'
      if (editType === 'null') val = null
      if (editType === 'object') val = {}
      if (editType === 'array') val = []

      if (isAdding && parentNode) {
         const path = parentNode.id === 'root' ? [] : parentNode.id.split('.').slice(1)
         const parent = path.length === 0 ? newJson : _.get(newJson, path)

         if (Array.isArray(parent)) {
            parent.push(val)
         } else {
            parent[editKey] = val
         }
      } else if (editingNode) {
         const path = editingNode.id.split('.').slice(1)
         const parentPath = path.slice(0, -1)
         const oldKey = path[path.length - 1]

         const targetParent = parentPath.length === 0 ? newJson : _.get(newJson, parentPath)

         // If renaming key in object
         if (!Array.isArray(targetParent) && oldKey !== editKey) {
            // Preserve order? Hard with standard JS objects, but let's just delete and add
            const temp = targetParent[oldKey]
            delete targetParent[oldKey]
            targetParent[editKey] = val
         } else {
            // Just set value
            if (path.length === 0) {
               // Root edit?
               // If editing root value (e.g. primitive), we can't set it on newJson if newJson is that primitive.
               // But jsonData is usually object/array. If root is primitive, we handle it via setJsonData directly?
               // But here newJson is the clone.
               // If newJson is primitive, we can't mutate it by reference.
               // But our initialJson is object.
            } else {
               _.set(newJson, path, val)
            }
         }
      }

      setJsonData(newJson)
      setJsonString(JSON.stringify(newJson, null, 2))
      setIsDialogOpen(false)
   }

   const generateTreeData = useCallback((data: any, path: string = 'root'): TreeDataItem[] => {
      if (typeof data !== 'object' || data === null) {
         return []
      }

      return Object.keys(data).map(key => {
         const value = data[key]
         const type = getType(value)
         const id = `${path}.${key}`
         const isObject = type === 'object' || type === 'array'

         const node: TreeDataItem = {
            id,
            name: key,
            value: value,
            type: type as any,
            children: isObject ? generateTreeData(value, id) : undefined,
            icon: getIcon(type),
            actions: (
               <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                  {isObject && (
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleAdd(node) }}>
                        <Plus className="h-3 w-3" />
                     </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleEdit(node) }}>
                     <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(node) }}>
                     <Trash className="h-3 w-3" />
                  </Button>
               </div>
            )
         }
         return node
      })
   }, [jsonData]) // Depend on jsonData to refresh actions closures if needed, though mostly stateless

   useEffect(() => {
      if (jsonData) {
         const rootChildren = generateTreeData(jsonData)
         setTreeData([{
            id: 'root',
            name: 'root',
            value: jsonData,
            type: getType(jsonData) as any,
            children: rootChildren,
            icon: getIcon(getType(jsonData)),
            actions: (
               <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleAdd({ id: 'root', name: 'root', type: getType(jsonData) as any } as TreeDataItem) }}>
                     <Plus className="h-3 w-3" />
                  </Button>
               </div>
            )
         }])
      }
   }, [jsonData, generateTreeData])

   return (
      <div className="h-screen w-full flex flex-col p-4 gap-4">
         <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">JSON Editor</h1>
            {error && <span className="text-destructive text-sm">{error}</span>}
         </div>

         <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border">
            <ResizablePanel defaultSize={40} minSize={20}>
               <div className="h-full p-4 bg-muted/10">
                  <Textarea
                     value={jsonString}
                     onChange={handleTextChange}
                     className="h-full font-mono text-sm resize-none border-0 bg-transparent focus-visible:ring-0"
                     spellCheck={false}
                  />
               </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={60} minSize={20}>
               <div className="h-full overflow-auto p-2">
                  <TreeView
                     data={treeData}
                     className="w-full"
                     renderItem={({ item, isLeaf }) => (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                           {item.icon && <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                           <span className="font-medium text-foreground">{item.name}</span>
                           {isLeaf && (
                              <span className="text-muted-foreground truncate">
                                 : {String(item.value)}
                              </span>
                           )}
                           <span className="text-xs text-muted-foreground/50 ml-2">
                              {item.type}
                           </span>
                        </div>
                     )}
                  />
               </div>
            </ResizablePanel>
         </ResizablePanelGroup>

         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>{isAdding ? 'Add New Item' : 'Edit Item'}</DialogTitle>
               </DialogHeader>
               <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="key" className="text-right">Key</Label>
                     <Input
                        id="key"
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        className="col-span-3"
                        disabled={!isAdding && Array.isArray(_.get(jsonData, editingNode?.id.split('.').slice(1, -1).join('.') || '', jsonData))}
                     />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="type" className="text-right">Type</Label>
                     <select
                        id="type"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                     >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="object">Object</option>
                        <option value="array">Array</option>
                        <option value="null">Null</option>
                     </select>
                  </div>
                  {['string', 'number', 'boolean'].includes(editType) && (
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="value" className="text-right">Value</Label>
                        <Input
                           id="value"
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           className="col-span-3"
                        />
                     </div>
                  )}
               </div>
               <DialogFooter>
                  <Button onClick={saveEdit}>Save changes</Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   )
}
