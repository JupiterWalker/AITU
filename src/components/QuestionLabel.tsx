import React from 'react';

export type QStyle = Partial<{
  fontSize: number;        // px
  color: string;
  fontWeight: 400|500|600|700;
  lineHeight: number;      // 1.4 等
  fontFamily: string;
  textTransform: 'none'|'uppercase'|'capitalize';
  maxLines: number;        // 多行省略
}>;

export function QuestionLabel({
  text,
  style,
  className,
}: {
  text: string;
  style?: QStyle;
  className?: string;
}) {
  const s: React.CSSProperties = {
    fontSize: (style?.fontSize ?? 14) + 'px',
    color: style?.color ?? 'var(--kg-q-color)',
    fontWeight: (style?.fontWeight ?? 700) as any,
    lineHeight: String(style?.lineHeight ?? 1.5),
    fontFamily: style?.fontFamily ?? 'var(--kg-q-font)',
    textTransform: style?.textTransform ?? 'none',
    display: '-webkit-box',
    WebkitLineClamp: (style?.maxLines ?? 3) as any,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
  return (
    <div className={['kg-q', className].filter(Boolean).join(' ')} style={s}>
      {text}
    </div>
  );
}
