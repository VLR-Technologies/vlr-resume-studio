import type { ReactNode } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

function Item({
  id,
  label,
  children,
  up,
  down,
}: {
  id: string;
  label: string;
  children: ReactNode;
  up?: () => void;
  down?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="sortable-item"
    >
      <div className="sort-controls">
        <button
          ref={setActivatorNodeRef}
          className="icon-control drag-handle"
          type="button"
          aria-label={`Drag ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <button
          className="icon-control"
          type="button"
          aria-label={`Move ${label} up`}
          disabled={!up}
          onClick={up}
        >
          <ArrowUp size={13} />
        </button>
        <button
          className="icon-control"
          type="button"
          aria-label={`Move ${label} down`}
          disabled={!down}
          onClick={down}
        >
          <ArrowDown size={13} />
        </button>
      </div>
      <div className="sortable-content">{children}</div>
    </div>
  );
}
export function SortableList<T extends { id: string }>({
  items,
  label,
  onChange,
  children,
}: {
  items: T[];
  label: (item: T) => string;
  onChange: (items: T[]) => void;
  children: (item: T) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id)
          onChange(
            arrayMove(
              items,
              items.findIndex((i) => i.id === active.id),
              items.findIndex((i) => i.id === over.id),
            ),
          );
      }}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item, index) => (
          <Item
            key={item.id}
            id={item.id}
            label={label(item)}
            up={
              index
                ? () => onChange(arrayMove(items, index, index - 1))
                : undefined
            }
            down={
              index < items.length - 1
                ? () => onChange(arrayMove(items, index, index + 1))
                : undefined
            }
          >
            {children(item)}
          </Item>
        ))}
      </SortableContext>
    </DndContext>
  );
}
