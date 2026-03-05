import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  try {
    const result = await db.query('SELECT NOW() AS time')
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      time: result.rows[0].time,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { status: 'error', database: 'disconnected', message },
      { status: 500 }
    )
  }
}
