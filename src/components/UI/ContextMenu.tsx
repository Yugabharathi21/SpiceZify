import React, { useEffect, useRef, useState } from 'react';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  visible: boolean;
  position: { x: number, y: number };
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, visible, position, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: position.y, left: position.x });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Adjust menu position to stay within viewport
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let top = position.y;
        let left = position.x;
        
        // Adjust if menu goes beyond right edge
        if (rect.right > viewportWidth) {
          left = position.x - rect.width;
        }
        
        // Adjust if menu goes beyond bottom edge
        if (rect.bottom > viewportHeight) {
          top = position.y - rect.height;
        }
        
        setMenuPosition({ top, left });
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, position.x, position.y, onClose]);

  if (!visible) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-spotify-dark-gray border border-spotify-border rounded shadow-lg"
      style={{ 
        top: menuPosition.top, 
        left: menuPosition.left,
        minWidth: '180px'
      }}
    >
      <div className="py-1">
        {items.map((item, index) => (
          <div
            key={index}
            className={`px-4 py-2 flex items-center space-x-2 text-spotify-white hover:bg-spotify-medium-gray cursor-pointer text-sm ${item.className || ''}`}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
          >
            {item.icon && <div className="w-5 h-5">{item.icon}</div>}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContextMenu;
