'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, PlayCircle, Trash2, Plus, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils/cn'
import type { TopicQueue as TopicQueueType } from '@/types'

interface TopicQueueProps {
  topics: TopicQueueType[]
  onTopicsChange: (topics: TopicQueueType[]) => void
  onGenerateNow: (topicId: string) => void
}

function SortableTopicRow({
  topic,
  onDelete,
  onGenerateNow,
}: {
  topic: TopicQueueType
  onDelete: () => void
  onGenerateNow: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 py-2.5 px-3 rounded-[8px] border border-[var(--border)] bg-[var(--bg-card)] mb-1.5 transition-shadow',
        isDragging && 'shadow-lg opacity-90 z-10'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 text-[var(--text-dim)] hover:text-[var(--text-secondary)] cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>

      <span className="flex-1 text-[13px] text-[var(--text-primary)] truncate">
        {topic.topic}
      </span>

      {topic.status === 'generating' && (
        <Badge variant="accent" size="sm" dot>
          Generating
        </Badge>
      )}
      {topic.status === 'done' && (
        <Badge variant="success" size="sm">
          Done
        </Badge>
      )}
      {topic.status === 'failed' && (
        <Badge variant="danger" size="sm">
          Failed
        </Badge>
      )}

      <button
        onClick={onGenerateNow}
        disabled={topic.status === 'generating'}
        className="p-1 rounded-md text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors cursor-pointer disabled:opacity-30"
        title="Generate now"
      >
        <PlayCircle size={14} />
      </button>

      <button
        onClick={onDelete}
        className="p-1 rounded-md text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors cursor-pointer"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function TopicQueue({
  topics,
  onTopicsChange,
  onGenerateNow,
}: TopicQueueProps) {
  const { toast } = useToast()
  const [newTopic, setNewTopic] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = topics.findIndex((t) => t.id === active.id)
      const newIndex = topics.findIndex((t) => t.id === over.id)
      const reordered = arrayMove(topics, oldIndex, newIndex).map((t, i) => ({
        ...t,
        order: i,
      }))

      onTopicsChange(reordered)

      // Persist order
      fetch('/api/autopilot/topics/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicIds: reordered.map((t) => t.id),
        }),
      }).catch(() => {
        toast({ message: 'Failed to save order', type: 'error' })
      })
    },
    [topics, onTopicsChange, toast]
  )

  const handleAddTopic = useCallback(() => {
    if (!newTopic.trim()) return

    const newItem: TopicQueueType = {
      id: `topic-${Date.now()}`,
      userId: '',
      topic: newTopic.trim(),
      niche: '',
      order: topics.length,
      status: 'pending',
      createdAt: new Date(),
    }

    onTopicsChange([...topics, newItem])
    setNewTopic('')

    fetch('/api/autopilot/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: newTopic.trim() }),
    }).catch(() => {
      toast({ message: 'Failed to add topic', type: 'error' })
    })
  }, [newTopic, topics, onTopicsChange, toast])

  const handleDelete = useCallback(
    (id: string) => {
      onTopicsChange(topics.filter((t) => t.id !== id))
      fetch('/api/autopilot/topics', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: id }),
      }).catch(() => {
        toast({ message: 'Failed to delete topic', type: 'error' })
      })
    },
    [topics, onTopicsChange, toast]
  )

  const handleRegenerateAll = useCallback(async () => {
    setRegenerating(true)
    try {
      const res = await fetch('/api/autopilot/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      })
      const data = await res.json()
      if (data.success && data.data?.topics) {
        onTopicsChange(data.data.topics)
        toast({ message: 'Topics regenerated!', type: 'success' })
      }
    } catch {
      toast({ message: 'Failed to regenerate', type: 'error' })
    } finally {
      setRegenerating(false)
    }
  }, [onTopicsChange, toast])

  const pendingTopics = topics.filter((t) => t.status === 'pending')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--text-primary)]">
            This Week
          </span>
          <Badge variant="accent" size="sm">
            {pendingTopics.length} queued
          </Badge>
        </div>
      </div>

      {/* Sortable list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={topics.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {topics.map((topic) => (
            <SortableTopicRow
              key={topic.id}
              topic={topic}
              onDelete={() => handleDelete(topic.id)}
              onGenerateNow={() => onGenerateNow(topic.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {topics.length === 0 && (
        <p className="text-[12px] text-[var(--text-dim)] text-center py-6">
          No topics queued. Add topics below or regenerate.
        </p>
      )}

      {/* Add topic input */}
      <div className="flex gap-2 mt-3">
        <input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
          placeholder="Add custom topic..."
          className="flex-1 h-9 px-3 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none"
        />
        <Button size="md" variant="secondary" onClick={handleAddTopic}>
          <Plus size={14} />
          Add
        </Button>
      </div>

      {/* Regenerate all */}
      <div className="flex justify-end mt-3">
        <button
          onClick={handleRegenerateAll}
          disabled={regenerating}
          className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={cn(regenerating && 'animate-spin')} />
          Regenerate all topics
        </button>
      </div>
    </div>
  )
}

export { TopicQueue }
