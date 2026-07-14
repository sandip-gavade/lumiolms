import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 8,
          background: 'linear-gradient(135deg,#6366F1,#4338CA)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#fff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
