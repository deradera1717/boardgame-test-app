import { useState, useCallback } from 'react';

export interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  draggedItemType: 'otaku-piece' | 'goods' | null;
}

export const useDragAndDrop = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItemId: null,
    draggedItemType: null
  });

  const startDrag = useCallback((itemId: string, itemType: 'otaku-piece' | 'goods') => {
    setDragState({
      isDragging: true,
      draggedItemId: itemId,
      draggedItemType: itemType
    });
  }, []);

  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItemId: null,
      draggedItemType: null
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, itemId: string, itemType: 'otaku-piece' | 'goods') => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.setData('application/json', JSON.stringify({ itemId, itemType }));
    e.dataTransfer.effectAllowed = 'move';
    startDrag(itemId, itemType);
  }, [startDrag]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    endDrag();
  }, [endDrag]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, onDrop: (itemId: string, itemType: string) => void) => {
    e.preventDefault();
    
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const { itemId, itemType } = JSON.parse(jsonData);
        onDrop(itemId, itemType);
      } else {
        // フォールバック: プレーンテキストから取得
        const itemId = e.dataTransfer.getData('text/plain');
        if (itemId) {
          onDrop(itemId, 'otaku-piece'); // デフォルトタイプ
        }
      }
    } catch (error) {
      console.error('ドロップデータの解析に失敗しました:', error);
    }
    
    endDrag();
  }, [endDrag]);

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop
  };
};