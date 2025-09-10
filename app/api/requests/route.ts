import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, adminRequests } from '@/shared/schema';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { category, subject, description } = await req.json();
    if (!category || !subject || !description) {
      return NextResponse.json({ message: 'Category, subject, and description are required.' }, { status: 400 });
    }

    const newRequest = await db.insert(adminRequests).values({
      userId: parseInt(session.user.id, 10),
      category,
      subject,
      description,
      status: 'Open',
    }).returning();

    if (resend && session.user.email) {
      resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@datazag.com',
        to: 'support@datazag.com',
        subject: `New Customer Request [${category}]: ${subject}`,
        html: `<h1>New Support Request</h1><p>From: ${session.user.email}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Description:</strong></p><p>${description}</p>`,
      }).catch(console.error);
    }

    return NextResponse.json(newRequest[0], { status: 201 });
  } catch (error) {
    console.error('Error creating admin request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}