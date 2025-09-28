import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { and, eq, gte } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        // Use the same text parsing approach that works
        const bodyText = await req.text();
        const { token, password } = JSON.parse(bodyText);
        
        if (!token || !password || password.length < 8) {
            return NextResponse.json({ message: 'Token and a valid password are required.' }, { status: 400 });
        }

        const user = await db.query.users.findFirst({
            where: and(
                eq(users.passwordResetToken, token),
                gte(users.passwordResetExpires, new Date().toISOString())
            )
        });

        if (!user) {
            return NextResponse.json({ message: 'Invalid or expired password reset token.' }, { status: 400 });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);

        await db.update(users)
            .set({ 
                password: hashedPassword, 
                passwordResetToken: null, 
                passwordResetExpires: null 
            })
            .where(eq(users.id, user.id));

        return NextResponse.json({ message: 'Password has been reset successfully. You can now log in.' });
        
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}