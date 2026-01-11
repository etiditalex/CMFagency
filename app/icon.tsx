import { ImageResponse } from 'next/og';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default async function Icon() {
  try {
    // Fetch the image
    const imageUrl = 'https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg';
    const imageResponse = await fetch(imageUrl, {
      cache: 'no-store',
    });
    
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;
    
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
          }}
        >
          <img
            src={dataUrl}
            alt="Changer Fusions Logo"
            width={512}
            height={512}
            style={{
              objectFit: 'contain',
            }}
          />
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (error) {
    // Fallback to a simple colored icon if image fetch fails
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)',
            fontSize: 200,
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          CF
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
