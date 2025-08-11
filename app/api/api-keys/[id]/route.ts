// Session-based delete for current user's API key
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/getCurrentUser';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const id = params.id;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ success: false, error: 'Invalid API key ID' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Delete only if the key belongs to the current user
    const result = await client.query(
      `
      DELETE FROM api_keys
      WHERE id = $1 AND user_id = $2
      RETURNING id, key_name AS name
      `,
      [Number(id), String(user.id)]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
      deleted_key: result.rows[0],
    });
  } catch (error: any) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }