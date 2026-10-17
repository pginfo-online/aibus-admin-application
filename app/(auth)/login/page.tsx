'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { toast } from '@/store/toast-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Bus, Lock, Mail, AlertCircle } from 'lucide-react';
import type { LoginResponseData } from '@/types/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid administrative email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      const response = await apiClient.post<LoginResponseData>(
        '/auth/login',
        values,
        { skipAuth: true }
      );

      if (response.success && response.data) {
        const { user, tokens } = response.data;

        // Verify that the user has an administrative role
        const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'SUPPORT_AGENT'];
        if (!allowedRoles.includes(user.role)) {
          setErrorMessage(
            'Access denied. Your account does not have administrative privileges for this portal.'
          );
          return;
        }

        setAuth(user, tokens);
        toast.success(`Welcome back, ${user.firstName || user.email}!`);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to connect to the backend server. Check the configured API URL and try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 shadow-xl shadow-amber-500/20 mb-4">
            <Bus className="h-8 w-8 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AiBus <span className="text-amber-500">Enterprise</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Administrative Management & Operations Portal
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-white">Administrator Sign In</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter your authorized credentials to access management capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="admin@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                {...register('password')}
              />

              <Button
                type="submit"
                variant="gold"
                size="lg"
                className="w-full mt-2"
                isLoading={isSubmitting}
              >
                Access Admin Portal
              </Button>
            </form>

          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-slate-500">
          Protected by Bearer JWT rotation & automated audit logging.
        </div>
      </div>
    </div>
  );
}
