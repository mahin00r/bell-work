import { t } from '../../ui/i18n';
import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, KeyboardCoordinateGetter } from '@dnd-kit/core';
import { GripVertical, Plus } from 'lucide-react';
import { Button, EmptyState, KindIcon, ProgressRing, Segments } from '../../ui/primitives';
import { DueChip } from '../today/Today';
import { applyStatus, isApplication } from '../../shared/selectors';
import { updateItem, useStore } from '../../shared/store';
import { statuses } from '../../shared/schema';
import type { Application, Item, Status } from '../../shared/types';
import { motion } from 'motion/react';
import { snappy, useReducedMotion } from '../../ui/motion';
import { Milestone, useMilestones } from '../../ui/Milestone';
const label = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);
const keyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
  if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
    event.preventDefault();
    return {
      ...currentCoordinates,
      x: currentCoordinates.x + (event.code === 'ArrowRight' ? 286 : -286),
    };
  }
  if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
    event.preventDefault();
    return {
      ...currentCoordinates,
      y: currentCoordinates.y + (event.code === 'ArrowDown' ? 40 : -40),
    };
  }
  return undefined;
};
export function moveApplication(id: string, status: Status) {
  return updateItem(id, (i) => (isApplication(i) ? applyStatus(i, status) : i));
}
function Card({
  item,
  onOpen,
  celebrate,
}: {
  item: Application;
  onOpen: (i: Item) => void;
  celebrate: boolean;
}) {
  const reduced = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });
  return (
    <motion.article
      ref={setNodeRef}
      className={`board-card ${isDragging ? 'dragging' : ''}`}
      style={{ x: transform?.x ?? 0, y: transform?.y ?? 0 }}
      animate={{ scale: isDragging && !reduced ? 1.03 : 1 }}
      transition={snappy}
    >
      {celebrate && <Milestone />}
      <div className="between">
        <KindIcon kind={item.kind} />
        <button
          {...listeners}
          {...attributes}
          className="drag-handle"
          aria-label={t('Drag {0}', item.title)}
        >
          <GripVertical size={15} />
        </button>
      </div>
      <button className="card-title" onClick={() => onOpen(item)}>
        {item.title}
      </button>
      <p>{item.organization || t('Application')}</p>
      <div className="card-footer">
        <DueChip item={item} />
        <span
          className={`priority ${item.priority}`}
          title={t('{0} priority', label(item.priority))}
        />
        <ProgressRing
          done={item.checklist.filter((c) => c.done).length}
          total={item.checklist.length}
        />
      </div>
      <label className="sr-only" htmlFor={`status-${item.id}`}>
        {t('Move {0} to status', item.title)}
      </label>
      <select
        id={`status-${item.id}`}
        className="card-status"
        value={item.status}
        onChange={(e) => {
          void moveApplication(item.id, e.target.value as Status);
        }}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {t(label(s))}
          </option>
        ))}
      </select>
    </motion.article>
  );
}
function Column({
  status,
  items,
  onOpen,
  onAdd,
  celebrating,
}: {
  status: Status;
  items: Application[];
  onOpen: (i: Item) => void;
  onAdd: () => void;
  celebrating: Set<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [limit, setLimit] = useState(50);
  return (
    <section
      ref={setNodeRef}
      className={`board-column ${isOver ? 'drop-target' : ''}`}
      aria-label={t('{0} column', label(status))}
    >
      <div className="column-heading">
        <span className={`status-dot ${status}`} />
        <h2>{t(label(status))}</h2>
        <span>{items.length}</span>
        <button onClick={onAdd} aria-label={t('Add an application')}>
          <Plus size={14} />
        </button>
      </div>
      <div className="column-cards">
        {items.slice(0, limit).map((i) => (
          <Card item={i} key={i.id} onOpen={onOpen} celebrate={celebrating.has(i.id)} />
        ))}
        {items.length > limit && (
          <Button variant="ghost" onClick={() => setLimit((current) => current + 50)}>
            {t('Show 50 more')}
          </Button>
        )}
        {items.length === 0 && (
          <p className="column-empty">{t('A little room for possibility.')}</p>
        )}
      </div>
    </section>
  );
}
export function Board({ onOpen, onAdd }: { onOpen: (i: Item) => void; onAdd: () => void }) {
  const items = useStore((s) => s.data.items);
  const celebrating = useMilestones(items);
  const [kind, setKind] = useState('all');
  const apps = items
    .filter(isApplication)
    .filter((i) => !i.archivedAt && !i.deletedAt && (kind === 'all' || kind === i.kind));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );
  function onDragEnd({ active, over }: DragEndEvent) {
    if (over && statuses.includes(over.id as Status))
      void moveApplication(String(active.id), over.id as Status);
  }
  return (
    <>
      <div className="view-toolbar">
        <Segments
          label={t('Application kind')}
          value={kind}
          onChange={setKind}
          values={[
            { value: 'all', label: 'All applications' },
            { value: 'job', label: 'Jobs' },
            { value: 'study', label: 'Study' },
          ]}
        />
        <span className="muted text-xs">
          {apps.length}
          {t('possibilities, one place')}
        </span>
      </div>
      {apps.length === 0 ? (
        <EmptyState
          title={t('Your next chapter is unwritten')}
          description={t(
            'Save a job or study opportunity, then move it forward one step at a time.',
          )}
          action={
            <Button variant="primary" onClick={onAdd}>
              <Plus size={14} />
              {t('Add application')}
            </Button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                'Press Space to pick up. Use left and right arrows to move between status columns. Press Space to drop or Escape to cancel. You can also use the status selector on each card.',
            },
          }}
        >
          <div className="board">
            {statuses.map((s) => (
              <Column
                key={s}
                status={s}
                items={apps.filter((i) => i.status === s)}
                onOpen={onOpen}
                onAdd={onAdd}
                celebrating={celebrating}
              />
            ))}
          </div>
        </DndContext>
      )}
    </>
  );
}
