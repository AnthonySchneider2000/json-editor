'use client'

import React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronRight } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const treeVariants = cva(
    'group hover:before:opacity-100 before:absolute before:rounded-lg before:left-0 px-2 before:w-full before:opacity-0 before:bg-accent/70 before:inset-y-0 before:-z-10 relative isolate select-none'
)

const selectedTreeVariants = cva(
    'before:opacity-100 before:bg-blue-500/30 before:border-2 before:border-blue-600'
)

const cutTreeVariants = cva(
    'opacity-50'
)

const dragOverVariants = cva(
    'before:opacity-100 before:bg-primary/20 text-primary-foreground'
)

interface TreeDataItem {
    id: string
    name: string
    value?: any
    type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
    isKeyEditable?: boolean
    icon?: React.ComponentType<{ className?: string }>
    selectedIcon?: React.ComponentType<{ className?: string }>
    openIcon?: React.ComponentType<{ className?: string }>
    children?: TreeDataItem[]
    actions?: React.ReactNode
    onClick?: () => void
    draggable?: boolean
    droppable?: boolean
    disabled?: boolean
    className?: string
}

type TreeRenderItemParams = {
    item: TreeDataItem
    level: number
    isLeaf: boolean
    isSelected: boolean
    isCut: boolean
    isOpen?: boolean
    hasChildren: boolean
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
    data: TreeDataItem[] | TreeDataItem
    initialSelectedItemIds?: string[]
    onSelectChange?: (items: TreeDataItem[] | undefined) => void
    expandAll?: boolean
    defaultNodeIcon?: React.ComponentType<{ className?: string }>
    defaultLeafIcon?: React.ComponentType<{ className?: string }>
    onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void
    renderItem?: (params: TreeRenderItemParams) => React.ReactNode
    multiSelect?: boolean
    cutItemIds?: string[]
    onNodeClick?: (item: TreeDataItem, event: React.MouseEvent) => void
}

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
    (
        {
            data,
            initialSelectedItemIds,
            onSelectChange,
            expandAll,
            defaultLeafIcon,
            defaultNodeIcon,
            className,
            onDocumentDrag,
            renderItem,
            multiSelect = true,
            cutItemIds = [],
            onNodeClick,
            ...props
        },
        ref
    ) => {
        const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>(
            initialSelectedItemIds || []
        )

        const [draggedItem, setDraggedItem] = React.useState<TreeDataItem | null>(null)

        // Update internal state when prop changes
        React.useEffect(() => {
            if (initialSelectedItemIds) {
                setSelectedItemIds(initialSelectedItemIds)
            }
        }, [initialSelectedItemIds])

        const handleSelectChange = React.useCallback(
            (item: TreeDataItem | undefined) => {
                // This internal handler is now only used for single-select behavior if needed internally,
                // but the main logic should be driven by the parent or a more complex handler.
                // For backward compatibility or simple usage, we'll just pass the single item.
                // However, with multi-select, the parent usually controls the selection logic.
                // If onSelectChange is provided, we assume controlled component or parent handling.
                if (onSelectChange && item) {
                    onSelectChange([item])
                }
            },
            [onSelectChange]
        )

        const handleDragStart = React.useCallback((item: TreeDataItem) => {
            setDraggedItem(item)
        }, [])

        const handleDrop = React.useCallback((targetItem: TreeDataItem) => {
            if (draggedItem && onDocumentDrag && draggedItem.id !== targetItem.id) {
                onDocumentDrag(draggedItem, targetItem)
            }
            setDraggedItem(null)
        }, [draggedItem, onDocumentDrag])

        const expandedItemIds = React.useMemo(() => {
            if (!initialSelectedItemIds || initialSelectedItemIds.length === 0) {
                return [] as string[]
            }

            const ids: string[] = []

            function walkTreeItems(
                items: TreeDataItem[] | TreeDataItem,
                targetIds: string[]
            ) {
                if (Array.isArray(items)) {
                    for (let i = 0; i < items.length; i++) {
                        ids.push(items[i].id)
                        if (walkTreeItems(items[i], targetIds) && !expandAll) {
                            return true
                        }
                        if (!expandAll) ids.pop()
                    }
                } else if (!expandAll && targetIds.includes(items.id)) {
                    return true
                } else if (items.children) {
                    return walkTreeItems(items.children, targetIds)
                }
            }

            walkTreeItems(data, initialSelectedItemIds)
            return ids
        }, [data, expandAll, initialSelectedItemIds])

        return (
            <div className={cn('overflow-hidden relative p-2', className)}>
                <TreeItem
                    data={data}
                    ref={ref}
                    selectedItemIds={selectedItemIds}
                    handleSelectChange={handleSelectChange}
                    expandedItemIds={expandedItemIds}
                    defaultLeafIcon={defaultLeafIcon}
                    defaultNodeIcon={defaultNodeIcon}
                    handleDragStart={handleDragStart}
                    handleDrop={handleDrop}
                    draggedItem={draggedItem}
                    renderItem={renderItem}
                    cutItemIds={cutItemIds}
                    level={0}
                    onNodeClick={onNodeClick}
                    {...props}
                />
                <div
                    className='w-full h-[48px]'
                    onDrop={() => { handleDrop({ id: '', name: 'parent_div' }) }}>
                </div>
            </div>
        )
    }
)
TreeView.displayName = 'TreeView'

type TreeItemProps = TreeProps & {
    selectedItemIds: string[]
    handleSelectChange: (item: TreeDataItem | undefined) => void
    expandedItemIds: string[]
    defaultNodeIcon?: React.ComponentType<{ className?: string }>
    defaultLeafIcon?: React.ComponentType<{ className?: string }>
    handleDragStart?: (item: TreeDataItem) => void
    handleDrop?: (item: TreeDataItem) => void
    draggedItem: TreeDataItem | null
    cutItemIds: string[]
    level?: number
}

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
    (
        {
            className,
            data,
            selectedItemIds,
            handleSelectChange,
            expandedItemIds,
            defaultNodeIcon,
            defaultLeafIcon,
            handleDragStart,
            handleDrop,
            draggedItem,
            renderItem,
            cutItemIds,
            level,
            onSelectChange,
            expandAll,
            initialSelectedItemIds,
            onDocumentDrag,
            onNodeClick,
            ...props
        },
        ref
    ) => {
        if (!(Array.isArray(data))) {
            data = [data]
        }
        return (
            <div ref={ref} role="tree" className={className} {...props}>
                <ul>
                    {data.map((item) => {
                        const isSelected = selectedItemIds.includes(item.id)
                        return (
                            <li
                                key={item.id}
                                data-selected={isSelected}
                                className="peer group/li"
                            >
                                {item.children ? (
                                    <TreeNode
                                        item={item}
                                        level={level ?? 0}
                                        selectedItemIds={selectedItemIds}
                                        expandedItemIds={expandedItemIds}
                                        handleSelectChange={handleSelectChange}
                                        defaultNodeIcon={defaultNodeIcon}
                                        defaultLeafIcon={defaultLeafIcon}
                                        handleDragStart={handleDragStart}
                                        handleDrop={handleDrop}
                                        draggedItem={draggedItem}
                                        renderItem={renderItem}
                                        cutItemIds={cutItemIds}
                                        onNodeClick={onNodeClick}
                                    />
                                ) : (
                                    <TreeLeaf
                                        item={item}
                                        level={level ?? 0}
                                        selectedItemIds={selectedItemIds}
                                        handleSelectChange={handleSelectChange}
                                        defaultLeafIcon={defaultLeafIcon}
                                        handleDragStart={handleDragStart}
                                        handleDrop={handleDrop}
                                        draggedItem={draggedItem}
                                        renderItem={renderItem}
                                        cutItemIds={cutItemIds}
                                        onNodeClick={onNodeClick}
                                    />
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>
        )
    }
)
TreeItem.displayName = 'TreeItem'

const TreeNode = ({
    item,
    handleSelectChange,
    expandedItemIds,
    selectedItemIds,
    defaultNodeIcon,
    defaultLeafIcon,
    handleDragStart,
    handleDrop,
    draggedItem,
    renderItem,
    cutItemIds,
    level = 0,
    onNodeClick,
}: {
    item: TreeDataItem
    handleSelectChange: (item: TreeDataItem | undefined) => void
    expandedItemIds: string[]
    selectedItemIds: string[]
    defaultNodeIcon?: React.ComponentType<{ className?: string }>
    defaultLeafIcon?: React.ComponentType<{ className?: string }>
    handleDragStart?: (item: TreeDataItem) => void
    handleDrop?: (item: TreeDataItem) => void
    draggedItem: TreeDataItem | null
    renderItem?: (params: TreeRenderItemParams) => React.ReactNode
    cutItemIds: string[]
    level?: number
    onNodeClick?: (item: TreeDataItem, event: React.MouseEvent) => void
}) => {
    const [value, setValue] = React.useState(
        expandedItemIds.includes(item.id) ? [item.id] : []
    )
    const [isDragOver, setIsDragOver] = React.useState(false)
    const hasChildren = !!item.children?.length
    const isSelected = selectedItemIds.includes(item.id)
    const isCut = cutItemIds.includes(item.id)
    const isOpen = value.includes(item.id)

    const isFirstChildSelected = item.children && item.children.length > 0 && selectedItemIds.includes(item.children[0].id) && isOpen

    const onDragStart = (e: React.DragEvent) => {
        if (!item.draggable) {
            e.preventDefault()
            return
        }
        e.dataTransfer.setData('text/plain', item.id)
        handleDragStart?.(item)
    }

    const onDragOver = (e: React.DragEvent) => {
        if (item.droppable !== false && draggedItem && draggedItem.id !== item.id) {
            e.preventDefault()
            setIsDragOver(true)
        }
    }

    const onDragLeave = () => {
        setIsDragOver(false)
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        handleDrop?.(item)
    }

    return (
        <AccordionPrimitive.Root
            type="multiple"
            value={value}
            onValueChange={(s) => setValue(s)}
        >
            <AccordionPrimitive.Item value={item.id}>
                <div
                    style={{ '--level': level } as React.CSSProperties}
                    className={cn(
                        treeVariants(),
                        isSelected && selectedTreeVariants(),
                        // Remove bottom border/radius if next sibling is selected
                        "group-[&:has(+_.peer[data-selected=true])]/li:before:rounded-b-none group-[&:has(+_.peer[data-selected=true])]/li:before:border-b-0",
                        // Remove top border/radius if previous sibling is selected
                        "group-[.peer[data-selected=true]_+_&]/li:before:rounded-t-none group-[.peer[data-selected=true]_+_&]/li:before:border-t-0",
                        // Remove bottom border/radius if first child is selected
                        isFirstChildSelected && "before:rounded-b-none before:border-b-0",
                        // Remove top border/radius if first child of selected parent
                        "group-[&:first-child]/li:group-data-[parent-selected=true]/content:before:rounded-t-none group-[&:first-child]/li:group-data-[parent-selected=true]/content:before:border-t-0",
                        // Full width selection background
                        "before:left-[calc(var(--level)*-1.3125rem)] before:w-[calc(100%+var(--level)*1.3125rem)]",
                        isCut && cutTreeVariants(),
                        isDragOver && dragOverVariants(),
                        item.className,
                        "flex items-center py-2 cursor-pointer"
                    )}
                    onClick={(e) => {
                        handleSelectChange(item)
                        item.onClick?.()
                        onNodeClick?.(item, e)
                    }}
                    draggable={!!item.draggable}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                >
                    <AccordionPrimitive.Header asChild>
                        <AccordionPrimitive.Trigger
                            className="transition-all [&[data-state=open]>svg]:rotate-90 mr-1 focus:outline-none"
                        >
                            <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-accent-foreground/50" />
                        </AccordionPrimitive.Trigger>
                    </AccordionPrimitive.Header>

                    {renderItem ? (
                        renderItem({
                            item,
                            level,
                            isLeaf: false,
                            isSelected,
                            isCut,
                            isOpen,
                            hasChildren,
                        })
                    ) : (
                        <>
                            <TreeIcon
                                item={item}
                                isSelected={isSelected}
                                isOpen={isOpen}
                                default={defaultNodeIcon}
                            />
                            <span className="text-sm truncate">{item.name}</span>
                            <TreeActions isSelected={isSelected}>
                                {item.actions}
                            </TreeActions>
                        </>
                    )}
                </div>
                <AccordionContent
                    className="group/content"
                    data-parent-selected={isSelected}
                >
                    <div className="ml-4 pl-1 border-l pb-1 pt-0 group-data-[parent-selected=true]/content:pb-0">
                        <TreeItem
                            data={item.children ? item.children : item}
                            selectedItemIds={selectedItemIds}
                            handleSelectChange={handleSelectChange}
                            expandedItemIds={expandedItemIds}
                            defaultLeafIcon={defaultLeafIcon}
                            defaultNodeIcon={defaultNodeIcon}
                            handleDragStart={handleDragStart}
                            handleDrop={handleDrop}
                            draggedItem={draggedItem}
                            renderItem={renderItem}
                            cutItemIds={cutItemIds}
                            level={level + 1}
                            onNodeClick={onNodeClick}
                        />
                    </div>
                </AccordionContent>
            </AccordionPrimitive.Item>
        </AccordionPrimitive.Root>
    )
}

const TreeLeaf = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        item: TreeDataItem
        level: number
        selectedItemIds: string[]
        handleSelectChange: (item: TreeDataItem | undefined) => void
        defaultLeafIcon?: React.ComponentType<{ className?: string }>
        handleDragStart?: (item: TreeDataItem) => void
        handleDrop?: (item: TreeDataItem) => void
        draggedItem: TreeDataItem | null
        renderItem?: (params: TreeRenderItemParams) => React.ReactNode
        cutItemIds: string[]
        onNodeClick?: (item: TreeDataItem, event: React.MouseEvent) => void
    }
>(
    (
        {
            className,
            item,
            level,
            selectedItemIds,
            handleSelectChange,
            defaultLeafIcon,
            handleDragStart,
            handleDrop,
            draggedItem,
            renderItem,
            cutItemIds,
            onNodeClick,
            ...props
        },
        ref
    ) => {
        const [isDragOver, setIsDragOver] = React.useState(false)
        const isSelected = selectedItemIds.includes(item.id)
        const isCut = cutItemIds.includes(item.id)

        const onDragStart = (e: React.DragEvent) => {
            if (!item.draggable || item.disabled) {
                e.preventDefault()
                return
            }
            e.dataTransfer.setData('text/plain', item.id)
            handleDragStart?.(item)
        }

        const onDragOver = (e: React.DragEvent) => {
            if (item.droppable !== false && !item.disabled && draggedItem && draggedItem.id !== item.id) {
                e.preventDefault()
                setIsDragOver(true)
            }
        }

        const onDragLeave = () => {
            setIsDragOver(false)
        }

        const onDrop = (e: React.DragEvent) => {
            if (item.disabled) return
            e.preventDefault()
            setIsDragOver(false)
            handleDrop?.(item)
        }

        return (
            <div
                ref={ref}
                style={{ '--level': level } as React.CSSProperties}
                className={cn(
                    'flex text-left items-center py-2 cursor-pointer before:right-1',
                    treeVariants(),
                    className,
                    isSelected && selectedTreeVariants(),
                    // Remove bottom border/radius if next sibling is selected
                    "group-[&:has(+_.peer[data-selected=true])]/li:before:rounded-b-none group-[&:has(+_.peer[data-selected=true])]/li:before:border-b-0",
                    // Remove top border/radius if previous sibling is selected
                    "group-[.peer[data-selected=true]_+_&]/li:before:rounded-t-none group-[.peer[data-selected=true]_+_&]/li:before:border-t-0",
                    // Remove top border/radius if first child of selected parent
                    "group-[&:first-child]/li:group-data-[parent-selected=true]/content:before:rounded-t-none group-[&:first-child]/li:group-data-[parent-selected=true]/content:before:border-t-0",
                    // Full width selection background
                    "before:left-[calc(var(--level)*-1.3125rem)] before:w-[calc(100%+var(--level)*1.3125rem)]",
                    isCut && cutTreeVariants(),
                    isDragOver && dragOverVariants(),
                    item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                    item.className
                )}
                onClick={(e) => {
                    if (item.disabled) return
                    handleSelectChange(item)
                    item.onClick?.()
                    onNodeClick?.(item, e)
                }}
                draggable={!!item.draggable && !item.disabled}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                {...props}
            >
                {renderItem ? (
                    <>
                        <div className="h-4 w-4 shrink-0 mr-1" />
                        {renderItem({
                            item,
                            level,
                            isLeaf: true,
                            isSelected,
                            isCut,
                            hasChildren: false,
                        })}
                    </>
                ) : (
                    <>
                        <TreeIcon
                            item={item}
                            isSelected={isSelected}
                            default={defaultLeafIcon}
                        />
                        <span className="flex-grow text-sm truncate">{item.name}</span>
                        <TreeActions isSelected={isSelected && !item.disabled}>
                            {item.actions}
                        </TreeActions>
                    </>
                )}
            </div>
        )
    }
)
TreeLeaf.displayName = 'TreeLeaf'

const AccordionTrigger = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger
            ref={ref}
            className={cn(
                'flex flex-1 w-full items-center py-2 transition-all first:[&[data-state=open]>svg]:first-of-type:rotate-90',
                className
            )}
            {...props}
        >
            <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-accent-foreground/50 mr-1" />
            {children}
        </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content
        ref={ref}
        className={cn(
            'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
            className
        )}
        {...props}
    >
        {children}
    </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

const TreeIcon = ({
    item,
    isOpen,
    isSelected,
    default: defaultIcon
}: {
    item: TreeDataItem
    isOpen?: boolean
    isSelected?: boolean
    default?: React.ComponentType<{ className?: string }>
}) => {
    let Icon: React.ComponentType<{ className?: string }> | undefined = defaultIcon
    if (isSelected && item.selectedIcon) {
        Icon = item.selectedIcon
    } else if (isOpen && item.openIcon) {
        Icon = item.openIcon
    } else if (item.icon) {
        Icon = item.icon
    }
    return Icon ? (
        <Icon className="h-4 w-4 shrink-0 mr-2" />
    ) : (
        <></>
    )
}

const TreeActions = ({
    children,
    isSelected
}: {
    children: React.ReactNode
    isSelected: boolean
}) => {
    return (
        <div
            className={cn(
                isSelected ? 'block' : 'hidden',
                'absolute right-3 group-hover:block'
            )}
        >
            {children}
        </div>
    )
}

export {
    TreeView,
    type TreeDataItem,
    type TreeRenderItemParams,
    AccordionTrigger,
    AccordionContent,
    TreeLeaf,
    TreeNode,
    TreeItem
}
