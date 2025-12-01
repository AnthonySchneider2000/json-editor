'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { TreeView, TreeDataItem } from '@/components/tree-view'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
   DialogDescription,
} from "@/components/ui/dialog"
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover"
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
   Edit2,
   Check
} from 'lucide-react'
import _ from 'lodash'
import { cn } from '@/lib/utils'
import { z } from 'zod'

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

const TYPES = ['string', 'number', 'boolean', 'object', 'array', 'null'] as const
type JsonType = typeof TYPES[number]

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
   const [editType, setEditType] = useState<JsonType>('string')
   const [isAdding, setIsAdding] = useState(false)
   const [parentNode, setParentNode] = useState<TreeDataItem | null>(null)
   const [validationError, setValidationError] = useState<string | null>(null)

   // Delete Confirmation State
   const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
   const [nodeToDelete, setNodeToDelete] = useState<TreeDataItem | null>(null)
   const [dontShowDeleteConfirm, setDontShowDeleteConfirm] = useState(false)

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

   const getType = (value: any): JsonType => {
      if (Array.isArray(value)) return 'array'
      if (value === null) return 'null'
      return typeof value as JsonType
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

   const handleDeleteRequest = (node: TreeDataItem) => {
      if (dontShowDeleteConfirm) {
         performDelete(node)
      } else {
         setNodeToDelete(node)
         setIsDeleteConfirmOpen(true)
      }
   }

   const performDelete = (node: TreeDataItem) => {
      const path = node.id.split('.')
      // If root
      if (path.length === 1 && path[0] === 'root') {
         return
      }

      const newJson = _.cloneDeep(jsonData)
      const parentPath = path.slice(1, -1).join('.')
      const key = path[path.length - 1]

      if (parentPath === '') {
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
      setIsDeleteConfirmOpen(false)
      setNodeToDelete(null)
   }

   const handleEdit = (node: TreeDataItem) => {
      setEditingNode(node)
      setEditKey(node.name)
      setEditValue(String(node.value))
      setEditType(node.type as JsonType || 'string')
      setIsAdding(false)
      setValidationError(null)
      setIsDialogOpen(true)
   }

   const handleAdd = (node: TreeDataItem) => {
      setParentNode(node)
      setEditKey('')
      setEditValue('')
      setEditType('string')
      setIsAdding(true)
      setValidationError(null)
      setIsDialogOpen(true)
   }

   const validateValue = (value: string, type: JsonType) => {
      try {
         if (type === 'number') {
            z.number().parse(Number(value))
            if (isNaN(Number(value))) throw new Error("Invalid number")
         }
         if (type === 'boolean') {
            if (value !== 'true' && value !== 'false') throw new Error("Invalid boolean")
         }
         return true
      } catch (e) {
         return false
      }
   }

   const saveEdit = () => {
      if (!validateValue(editValue, editType)) {
         setValidationError(`Invalid value for type ${editType}`)
         return
      }

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
            if (!editKey) {
               setValidationError("Key is required")
               return
            }
            parent[editKey] = val
         }
      } else if (editingNode) {
         const path = editingNode.id.split('.').slice(1)
         const parentPath = path.slice(0, -1)
         const oldKey = path[path.length - 1]

         const targetParent = parentPath.length === 0 ? newJson : _.get(newJson, parentPath)

         if (!Array.isArray(targetParent) && oldKey !== editKey) {
            if (!editKey) {
               setValidationError("Key is required")
               return
            }
            const temp = targetParent[oldKey]
            delete targetParent[oldKey]
            targetParent[editKey] = val
         } else {
            if (path.length === 0) {
               // Root edit - not supported for now as it replaces whole doc
            } else {
               _.set(newJson, path, val)
            }
         }
      }

      setJsonData(newJson)
      setJsonString(JSON.stringify(newJson, null, 2))
      setIsDialogOpen(false)
   }

   const changeType = (node: TreeDataItem, newType: JsonType) => {
      const path = node.id.split('.').slice(1)
      if (path.length === 0) return // Don't change root type for now

      const newJson = _.cloneDeep(jsonData)
      let newVal: any = node.value

      // Simple type conversion or reset
      if (newType === 'string') newVal = String(newVal)
      else if (newType === 'number') newVal = Number(newVal) || 0
      else if (newType === 'boolean') newVal = Boolean(newVal)
      else if (newType === 'null') newVal = null
      else if (newType === 'object') newVal = {}
      else if (newType === 'array') newVal = []

      _.set(newJson, path, newVal)
      setJsonData(newJson)
      setJsonString(JSON.stringify(newJson, null, 2))
   }

   const handleKeyUpdate = (node: TreeDataItem, newKey: string) => {
      if (!newKey || newKey === node.name) return

      const path = node.id.split('.').slice(1)
      const parentPath = path.slice(0, -1)
      const oldKey = path[path.length - 1]

      const newJson = _.cloneDeep(jsonData)
      const parent = parentPath.length === 0 ? newJson : _.get(newJson, parentPath)

      if (Array.isArray(parent)) return

      if (parent[newKey] !== undefined) return

      const newParent: any = {}
      Object.keys(parent).forEach(k => {
         if (k === oldKey) {
            newParent[newKey] = parent[oldKey]
         } else {
            newParent[k] = parent[k]
         }
      })

      if (parentPath.length === 0) {
         setJsonData(newParent)
         setJsonString(JSON.stringify(newParent, null, 2))
      } else {
         _.set(newJson, parentPath, newParent)
         setJsonData(newJson)
         setJsonString(JSON.stringify(newJson, null, 2))
      }
   }

   const handleValueUpdate = (node: TreeDataItem, newValueStr: string) => {
      const path = node.id.split('.').slice(1)
      if (path.length === 0) return

      const newJson = _.cloneDeep(jsonData)
      let newVal: any = newValueStr

      if (node.type === 'number') {
         const num = Number(newValueStr)
         if (!isNaN(num)) newVal = num
      } else if (node.type === 'boolean') {
         newVal = newValueStr === 'true'
      } else if (node.type === 'null') {
         if (newValueStr === 'null') newVal = null
      }

      _.set(newJson, path, newVal)
      setJsonData(newJson)
      setJsonString(JSON.stringify(newJson, null, 2))
   }

   const generateTreeData = useCallback((data: any, path: string = 'root'): TreeDataItem[] => {
      if (typeof data !== 'object' || data === null) {
         return []
      }

      const isArray = Array.isArray(data)

      return Object.keys(data).map(key => {
         const value = data[key]
         const type = getType(value)
         const id = `${path}.${key}`
         const isObject = type === 'object' || type === 'array'

         const node: TreeDataItem = {
            id,
            name: key,
            value: value,
            type: type,
            isKeyEditable: !isArray,
            children: isObject ? generateTreeData(value, id) : undefined,
            icon: getIcon(type),
            actions: (
               <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                  {isObject && (
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleAdd(node) }}>
                        <Plus className="h-3 w-3" />
                     </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(node) }}>
                     <Trash className="h-3 w-3" />
                  </Button>
               </div>
            )
         }
         return node
      })
   }, [jsonData, dontShowDeleteConfirm])

   useEffect(() => {
      if (jsonData) {
         const rootChildren = generateTreeData(jsonData)
         setTreeData([{
            id: 'root',
            name: 'root',
            value: jsonData,
            type: getType(jsonData),
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
                        <div className="flex items-center gap-2 flex-1 min-w-0 group/item">
                           {item.icon && <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />}

                           {item.isKeyEditable ? (
                              <Input
                                 className="h-6 px-1 py-0 w-auto min-w-[50px] max-w-[150px] border-none hover:bg-muted/50 focus:bg-background font-medium"
                                 defaultValue={item.name}
                                 onBlur={(e) => handleKeyUpdate(item, e.target.value)}
                                 onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                 onClick={(e) => e.stopPropagation()}
                              />
                           ) : (
                              <span className="font-medium text-foreground">{item.name}</span>
                           )}
                           {isLeaf && (
                              <>
                                 <span className="text-muted-foreground">:</span>
                                 <Input
                                    className="h-6 px-1 py-0 ml-1 min-w-[50px] w-auto border-none hover:bg-muted/50 focus:bg-background text-muted-foreground"
                                    defaultValue={String(item.value)}
                                    onBlur={(e) => handleValueUpdate(item, e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                    onClick={(e) => e.stopPropagation()}
                                 />
                              </>
                           )}
                           <Popover>
                              <PopoverTrigger asChild>
                                 <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[10px] text-muted-foreground/50 hover:text-foreground ml-2"
                                    onClick={(e) => e.stopPropagation()}
                                 >
                                    {item.type}
                                 </Button>
                              </PopoverTrigger>

                              <PopoverContent className="w-32 p-1" align="start">
                                 <div className="grid gap-1">
                                    {TYPES.map((t) => (
                                       <Button
                                          key={t}
                                          variant="ghost"
                                          size="sm"
                                          className={cn(
                                             "justify-start h-7 text-xs",
                                             item.type === t && "bg-accent"
                                          )}
                                          onClick={(e) => {
                                             e.stopPropagation()
                                             changeType(item, t)
                                          }}
                                       >
                                          {t}
                                          {item.type === t && <Check className="ml-auto h-3 w-3" />}
                                       </Button>
                                    ))}
                                 </div>
                              </PopoverContent>
                           </Popover>

                           <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center">
                              {item.actions}
                           </div>


                        </div>
                     )}
                  />
               </div>
            </ResizablePanel>
         </ResizablePanelGroup>

         {/* Edit/Add Dialog */}
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
                        onChange={(e) => setEditType(e.target.value as JsonType)}
                        className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                     >
                        {TYPES.map(t => (
                           <option key={t} value={t}>{t}</option>
                        ))}
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
                  {validationError && (
                     <div className="text-destructive text-sm text-center">{validationError}</div>
                  )}
               </div>
               <DialogFooter>
                  <Button onClick={saveEdit}>Save changes</Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Delete Confirmation Dialog */}
         <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Delete Item</DialogTitle>
                  <DialogDescription>
                     Are you sure you want to delete <span className="font-bold text-foreground">{nodeToDelete?.name}</span>? This action cannot be undone.
                  </DialogDescription>
               </DialogHeader>
               <div className="flex items-center space-x-2 py-4">
                  <Checkbox
                     id="dont-show"
                     checked={dontShowDeleteConfirm}
                     onCheckedChange={(c) => setDontShowDeleteConfirm(c as boolean)}
                  />
                  <label
                     htmlFor="dont-show"
                     className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                     Don't show this again
                  </label>
               </div>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={() => nodeToDelete && performDelete(nodeToDelete)}>Delete</Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   )
}
