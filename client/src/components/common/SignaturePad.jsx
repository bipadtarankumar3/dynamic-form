'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import { ClearOutlined, CheckOutlined } from '@ant-design/icons';

export default function SignaturePad({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  width = 400,
  height = 140,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (value && typeof value === 'string' && value.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSignature(true);
      };
      img.src = value;
    } else if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  }, [value]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (disabled || readOnly) return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || disabled || readOnly) return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && onChange) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const handleClear = () => {
    if (disabled || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    if (onChange) onChange('');
  };

  return (
    <div style={{ display: 'inline-block', width: '100%', maxWidth: width }}>
      <div
        style={{
          border: '1px dashed #cbd5e1',
          borderRadius: 8,
          background: readOnly || disabled ? '#f8fafc' : '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          cursor: readOnly || disabled ? 'not-allowed' : 'crosshair',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width: '100%', height: `${height}px`, display: 'block' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#94a3b8',
              fontSize: 12,
              pointerEvents: 'none',
            }}
          >
            Sign here using mouse or touch
          </div>
        )}
      </div>

      {!readOnly && !disabled && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, gap: 6 }}>
          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={handleClear}
            style={{ borderRadius: 6, fontSize: 11 }}
          >
            Clear Signature
          </Button>
        </div>
      )}
    </div>
  );
}
