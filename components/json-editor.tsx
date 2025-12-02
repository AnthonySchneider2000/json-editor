'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
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
   Check,
   RotateCcw,
   RotateCw,
   Sun,
   Moon,
   Copy,
   Scissors,
   ClipboardPaste,
   ChevronRight,
   ChevronDown,
   Trash2
} from 'lucide-react'
import _ from 'lodash'
import { cn } from '@/lib/utils'
import {
   ContextMenu,
   ContextMenuContent,
   ContextMenuItem,
   ContextMenuShortcut,
   ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useTheme } from "next-themes"
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
   const { theme, setTheme } = useTheme()
   const [jsonString, setJsonString] = useState(JSON.stringify(initialJson, null, 2))
   const [jsonData, setJsonData] = useState<any>(initialJson)
   const [error, setError] = useState<string | null>(null)
   const [treeData, setTreeData] = useState<TreeDataItem[]>([])

   // Selection State
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
   const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
   const [cutIds, setCutIds] = useState<Set<string>>(new Set())

   // Edit Dialog State
   const [isDialogOpen, setIsDialogOpen] = useState(false)
   const [editingNode, setEditingNode] = useState<TreeDataItem | null>(null)
   const [editKey, setEditKey] = useState('')
   const [editValue, setEditValue] = useState('')
   const [editType, setEditType] = useState<JsonType>('string')
   const [isAdding, setIsAdding] = useState(false)
   const [parentNode, setParentNode] = useState<TreeDataItem | null>(null)
   const [validationError, setValidationError] = useState<string | null>(null)

   // History State
   const [history, setHistory] = useState<{ past: any[], future: any[] }>({ past: [], future: [] })

   // Delete Confirmation State
   const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
   const [nodeToDelete, setNodeToDelete] = useState<TreeDataItem | null>(null)
   const [dontShowDeleteConfirm, setDontShowDeleteConfirm] = useState(false)

   const addToHistory = useCallback((data: any) => {
      setHistory(prev => ({
         past: [...prev.past, data],
         future: []
      }))
   }, [])

   const handleUndo = useCallback(() => {
      if (history.past.length === 0) return

      const previous = history.past[history.past.length - 1]
      const newPast = history.past.slice(0, -1)

      setHistory({
         past: newPast,
         future: [jsonData, ...history.future]
      })
      setJsonData(previous)
      setJsonString(JSON.stringify(previous, null, 2))
   }, [history, jsonData])

   const handleRedo = useCallback(() => {
      if (history.future.length === 0) return

      const next = history.future[0]
      const newFuture = history.future.slice(1)

      setHistory({
         past: [...history.past, jsonData],
         future: newFuture
      })
      setJsonData(next)
      setJsonString(JSON.stringify(next, null, 2))
   }, [history, jsonData])

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
      addToHistory(jsonData)
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
      setSelectedIds(new Set())
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

      addToHistory(jsonData)
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

      addToHistory(jsonData)
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

      addToHistory(jsonData)
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

      addToHistory(jsonData)
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
            draggable: true,
            droppable: true,
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

   // Helper to flatten tree for range selection
   const flattenTree = (items: TreeDataItem[]): string[] => {
      let ids: string[] = []
      for (const item of items) {
         ids.push(item.id)
         if (item.children) {
            ids = ids.concat(flattenTree(item.children))
         }
      }
      return ids
   }

   const handleNodeClick = (e: React.MouseEvent, node: TreeDataItem) => {
      e.stopPropagation()

      const newSelectedIds = new Set(selectedIds)

      if (e.ctrlKey || e.metaKey) {
         // Toggle
         if (newSelectedIds.has(node.id)) {
            newSelectedIds.delete(node.id)
         } else {
            newSelectedIds.add(node.id)
            setLastSelectedId(node.id)
         }
      } else if (e.shiftKey && lastSelectedId) {
         // Range select
         const flatIds = flattenTree(treeData)
         const startIdx = flatIds.indexOf(lastSelectedId)
         const endIdx = flatIds.indexOf(node.id)

         if (startIdx !== -1 && endIdx !== -1) {
            const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)]
            const range = flatIds.slice(min, max + 1)
            newSelectedIds.clear()
            range.forEach(id => newSelectedIds.add(id))
         }
      } else {
         // Single select
         newSelectedIds.clear()
         newSelectedIds.add(node.id)
         setLastSelectedId(node.id)
      }

      setSelectedIds(newSelectedIds)
   }

   // Clipboard operations
   const handleCopy = useCallback(() => {
      if (selectedIds.size === 0) return

      const flatIds = flattenTree(treeData)
      const sortedIds = Array.from(selectedIds).sort((a, b) => flatIds.indexOf(a) - flatIds.indexOf(b))

      // Check if we are copying from an object or array
      // We look at the parent of the first selected item
      const firstId = sortedIds[0]
      const firstPath = firstId.split('.').slice(1)
      const parentPath = firstPath.slice(0, -1)
      const parent = parentPath.length === 0 ? jsonData : _.get(jsonData, parentPath)
      const isParentArray = Array.isArray(parent)

      let textToCopy = ''

      if (isParentArray) {
         const selectedItems: any[] = []
         sortedIds.forEach(id => {
            const path = id.split('.').slice(1)
            if (path.length === 0) {
               selectedItems.push(jsonData)
            } else {
               const val = _.get(jsonData, path)
               selectedItems.push(val)
            }
         })
         textToCopy = JSON.stringify(selectedItems, null, 2)
      } else {
         const selectedItems: Record<string, any> = {}
         sortedIds.forEach(id => {
            const path = id.split('.').slice(1)
            const key = path[path.length - 1]
            if (path.length === 0) {
               // Root selected?
               selectedItems['root'] = jsonData
            } else {
               const val = _.get(jsonData, path)
               selectedItems[key] = val
            }
         })
         textToCopy = JSON.stringify(selectedItems, null, 2)
      }

      navigator.clipboard.writeText(textToCopy)
      setCutIds(new Set()) // Clear cut on copy
   }, [selectedIds, jsonData, treeData])

   const handleCut = useCallback(() => {
      if (selectedIds.size === 0) return
      handleCopy()
      setCutIds(new Set(selectedIds))
   }, [selectedIds, handleCopy])

   const handlePaste = useCallback(async () => {
      if (selectedIds.size === 0) return

      try {
         const text = await navigator.clipboard.readText()
         const pastedData = JSON.parse(text)

         if (!lastSelectedId) return

         const targetId = lastSelectedId
         const path = targetId.split('.').slice(1)

         addToHistory(jsonData)
         const newJson = _.cloneDeep(jsonData)

         // Determine target container
         let targetContainerPath = path
         let targetContainer = path.length === 0 ? newJson : _.get(newJson, path)
         let insertIndex = -1 // Append by default

         if (!Array.isArray(targetContainer) && typeof targetContainer !== 'object') {
            // Target is a leaf, paste into parent
            targetContainerPath = path.slice(0, -1)
            targetContainer = targetContainerPath.length === 0 ? newJson : _.get(newJson, targetContainerPath)
            // Insert after the target item
            const key = path[path.length - 1]
            if (Array.isArray(targetContainer)) {
               insertIndex = parseInt(key) + 1
            }
         } else if (targetContainer === null) {
            // Treat null as leaf
            targetContainerPath = path.slice(0, -1)
            targetContainer = targetContainerPath.length === 0 ? newJson : _.get(newJson, targetContainerPath)
         }

         const itemsToPaste = Array.isArray(pastedData) ? pastedData : [pastedData]

         // If target is array, push or insert
         if (Array.isArray(targetContainer)) {
            if (insertIndex !== -1) {
               targetContainer.splice(insertIndex, 0, ...itemsToPaste)
            } else {
               targetContainer.push(...itemsToPaste)
            }
         } else if (typeof targetContainer === 'object') {
            // If pastedData is an object (and not an array), try to use its keys
            if (!Array.isArray(pastedData) && typeof pastedData === 'object' && pastedData !== null) {
               Object.keys(pastedData).forEach(key => {
                  let finalKey = key
                  let counter = 1
                  while (targetContainer[finalKey] !== undefined) {
                     finalKey = `${key}_copy${counter}`
                     counter++
                  }
                  targetContainer[finalKey] = pastedData[key]
               })
            } else {
               // Fallback for arrays or primitives
               itemsToPaste.forEach((item, i) => {
                  const newKey = `new_item_${Date.now()}_${i}`
                  targetContainer[newKey] = item
               })
            }
         }

         // If this was a cut operation, remove original items
         if (cutIds.size > 0) {
            const sortedCutIds = Array.from(cutIds).sort((a, b) => b.length - a.length) // Deepest first

            sortedCutIds.forEach(cutId => {
               const cutPath = cutId.split('.').slice(1)
               const cutParentPath = cutPath.slice(0, -1)
               const cutKey = cutPath[cutPath.length - 1]

               const parent = cutParentPath.length === 0 ? newJson : _.get(newJson, cutParentPath)
               if (Array.isArray(parent)) {
                  parent[parseInt(cutKey)] = undefined
               } else {
                  delete parent[cutKey]
               }
            })

            // Cleanup undefineds in arrays
            const cleanUndefineds = (obj: any) => {
               if (Array.isArray(obj)) {
                  const newArr = obj.filter(x => x !== undefined)
                  obj.length = 0
                  obj.push(...newArr)
                  obj.forEach(cleanUndefineds)
               } else if (typeof obj === 'object' && obj !== null) {
                  Object.values(obj).forEach(cleanUndefineds)
               }
            }
            cleanUndefineds(newJson)

            setCutIds(new Set())
         }

         setJsonData(newJson)
         setJsonString(JSON.stringify(newJson, null, 2))

      } catch (e) {
         console.error("Paste failed", e)
      }
   }, [selectedIds, lastSelectedId, jsonData, cutIds])

   const handleDelete = useCallback(() => {
      if (selectedIds.size === 0) return

      // Find the node to delete (handling single selection for now)
      const idToDelete = Array.from(selectedIds)[0]

      const findNode = (nodes: TreeDataItem[]): TreeDataItem | null => {
         for (const node of nodes) {
            if (node.id === idToDelete) return node
            if (node.children) {
               const found = findNode(node.children)
               if (found) return found
            }
         }
         return null
      }

      const node = findNode(treeData)
      if (node) {
         handleDeleteRequest(node)
      }
   }, [selectedIds, treeData, dontShowDeleteConfirm, jsonData])

   const handleReorder = useCallback((source: TreeDataItem, target: TreeDataItem) => {
      // Check if they are siblings (share same parent path)
      const sourcePath = source.id.split('.').slice(1)
      const targetPath = target.id.split('.').slice(1)

      const sourceParentPath = sourcePath.slice(0, -1).join('.')
      const targetParentPath = targetPath.slice(0, -1).join('.')

      if (sourceParentPath !== targetParentPath) return // Only allow reordering siblings

      addToHistory(jsonData)
      const newJson = _.cloneDeep(jsonData)

      const parentPath = sourcePath.slice(0, -1)
      const parent = parentPath.length === 0 ? newJson : _.get(newJson, parentPath)

      const sourceKey = sourcePath[sourcePath.length - 1]
      const targetKey = targetPath[targetPath.length - 1]

      if (Array.isArray(parent)) {
         const sourceIndex = parseInt(sourceKey)
         const targetIndex = parseInt(targetKey)

         const [movedItem] = parent.splice(sourceIndex, 1)
         parent.splice(targetIndex, 0, movedItem)
      } else if (typeof parent === 'object' && parent !== null) {
         // Reorder object keys
         const keys = Object.keys(parent)
         const sourceIndex = keys.indexOf(sourceKey)
         const targetIndex = keys.indexOf(targetKey)

         if (sourceIndex !== -1 && targetIndex !== -1) {
            keys.splice(sourceIndex, 1)
            keys.splice(targetIndex, 0, sourceKey)

            const newParent: any = {}
            keys.forEach(k => {
               newParent[k] = parent[k]
            })

            if (parentPath.length === 0) {
               setJsonData(newParent)
               setJsonString(JSON.stringify(newParent, null, 2))
               return
            } else {
               _.set(newJson, parentPath, newParent)
            }
         }
      }

      setJsonData(newJson)
      setJsonString(JSON.stringify(newJson, null, 2))
   }, [jsonData, addToHistory])

   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

         if (e.key === 'Delete') {
            e.preventDefault()
            handleDelete()
            return
         }

         if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase()
            if (key === 'c') {
               e.preventDefault()
               handleCopy()
            } else if (key === 'x') {
               e.preventDefault()
               handleCut()
            } else if (key === 'v') {
               e.preventDefault()
               handlePaste()
            } else if (key === 'z') {
               e.preventDefault()
               handleUndo()
            } else if (key === 'y') {
               e.preventDefault()
               handleRedo()
            }
         }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
   }, [handleCopy, handleCut, handlePaste, handleDelete, handleUndo, handleRedo])

   return (
      <div className="h-screen w-full flex flex-col gap-4 p-4">
         <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">JSON Editor</h1>
            <div className="flex items-center gap-2">
               {error && <span className="text-destructive text-sm mr-4">{error}</span>}
               <div className="flex items-center gap-1 mr-2">
                  <Button
                     variant="ghost"
                     size="icon"
                     onClick={handleUndo}
                     disabled={history.past.length === 0}
                     title="Undo (Ctrl+Z)"
                  >
                     <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                     variant="ghost"
                     size="icon"
                     onClick={handleRedo}
                     disabled={history.future.length === 0}
                     title="Redo (Ctrl+Y)"
                  >
                     <RotateCw className="h-4 w-4" />
                  </Button>
               </div>
               <div className="h-4 w-[1px] bg-border mx-2" />
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  title="Toggle Theme"
               >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
               </Button>
            </div>
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
               <div className="h-full overflow-auto p-2" onClick={() => setSelectedIds(new Set())}>
                  <TreeView
                     data={treeData}
                     className="w-full"
                     initialSelectedItemIds={Array.from(selectedIds)}
                     cutItemIds={Array.from(cutIds)}
                     onNodeClick={(item, e) => handleNodeClick(e, item)}
                     onDocumentDrag={handleReorder}
                     renderItem={({ item, isLeaf, isSelected }) => (
                        <ContextMenu>
                           <ContextMenuTrigger asChild>
                              <div
                                 className="flex items-center gap-2 flex-1 min-w-0 group/item"
                                 onContextMenu={(e) => {
                                    if (!selectedIds.has(item.id)) {
                                       handleNodeClick(e, item)
                                    }
                                 }}
                              >
                                 {item.icon && <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />}

                                 {item.isKeyEditable ? (
                                    <Input
                                       className="h-6 px-1 py-0 w-auto min-w-[50px] max-w-[150px] border-none font-medium transition-colors hover:bg-muted/50 focus:bg-background"
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
                                          className="h-6 px-1 py-0 ml-1 min-w-[50px] w-auto border-none transition-colors hover:bg-muted/50 focus:bg-background text-muted-foreground"
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
                                          className="h-5 px-1.5 text-[10px] ml-2 transition-colors text-muted-foreground/50 hover:text-foreground"
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
                           </ContextMenuTrigger>
                           <ContextMenuContent>
                              <ContextMenuItem onClick={handleCopy}>
                                 Copy
                                 <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
                              </ContextMenuItem>
                              <ContextMenuItem onClick={handleCut}>
                                 Cut
                                 <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
                              </ContextMenuItem>
                              <ContextMenuItem onClick={handlePaste}>
                                 Paste
                                 <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleDeleteRequest(item)} className="text-destructive focus:text-destructive">
                                 Delete
                                 <ContextMenuShortcut>Del</ContextMenuShortcut>
                              </ContextMenuItem>
                           </ContextMenuContent>
                        </ContextMenu>
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
                  {!(isAdding && parentNode?.type === 'array') && (
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
                  )}
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
