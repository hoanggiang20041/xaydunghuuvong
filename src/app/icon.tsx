import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: '#1a365d',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d69e2e',
          borderRadius: '4px',
          fontWeight: 'bold',
        }}
      >
        HV
      </div>
    ),
    { ...size }
  )
}
