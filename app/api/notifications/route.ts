import { NextResponse } from 'next/server';

// List notifications (stubbed as empty array to satisfy UI expectation)
export async function GET() {
	// Return an array to prevent runtime errors like notifications.map is not a function
	return NextResponse.json([]);
}

// Placeholder for creating a notification or webhook receiver
export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({}));
		return NextResponse.json({ received: true, body }, { status: 200 });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
	}
}
