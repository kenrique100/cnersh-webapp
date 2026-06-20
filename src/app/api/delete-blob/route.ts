import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';

export async function DELETE(request: Request) {
    try {
        const { url } = await request.json();
        if (!url) {
            return NextResponse.json({ error: 'Missing url' }, { status: 400 });
        }
        await del(url);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Blob deletion failed:', err);
        return NextResponse.json({ error: 'Failed to delete blob' }, { status: 500 });
    }
}