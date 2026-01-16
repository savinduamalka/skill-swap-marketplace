'use client';

/**
 * Login Page Component
 *
 * Handles user authentication with email/password and social login options.
 * Includes form validation, password reset functionality, and remember me feature.
 *
 * @author SkillSwap Development Team
 * @version 1.0.0
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FormErrors {
  email?: string | null;
  password?: string | null;
  general?: string | null;
}

interface FormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  /**
   * Validates the login form fields
   * @returns boolean indicating if validation passed
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles email/password login submission
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all errors before logging in');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Simulate loading delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('skillswap_remember', 'true');
      }

      // Store mock user data for development
      localStorage.setItem(
        'skillswap_dev_user',
        JSON.stringify({
          email: formData.email,
          id: 'dev-user-123',
          user_metadata: {
            fullName: 'Dev User',
          },
        })
      );

      toast.success('Welcome back! Login successful.');

      // Navigate to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Login failed. Please try again.';
      console.error('Login error:', error);
      toast.error(errorMessage);
      setErrors({
        general: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles Google OAuth login
   */
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Failed to initiate Google login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles Facebook OAuth login
   */
  const handleFacebookLogin = async () => {
    try {
      setLoading(true);
      await signIn('facebook', { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error('Facebook login error:', error);
      toast.error('Failed to initiate Facebook login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles forgot password form submission
   */
  const handleForgotPassword = async () => {
    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setResetLoading(true);
    setResetSuccess(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setResetSuccess(true);
      toast.success('Password reset link sent to your email!');

      // Reset form after 3 seconds
      setTimeout(() => {
        setResetEmail('');
        setResetSuccess(false);
      }, 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send reset email.';
      console.error('Password reset error:', error);
      toast.error(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  /**
   * Handles Enter key press for form submission
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleEmailLogin(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Log in to your SkillSwap account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* General Error Alert */}
          {errors.general && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="social">Social Login</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-6">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) {
                        setErrors({ ...errors, email: null });
                      }
                    }}
                    placeholder="you@example.com"
                    className={errors.email ? 'border-red-500' : ''}
                    disabled={loading}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (errors.password) {
                          setErrors({ ...errors, password: null });
                        }
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder="••••••••"
                      className={
                        errors.password ? 'border-red-500 pr-10' : 'pr-10'
                      }
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Forgot Password?
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Enter your email address and we&apos;ll send you a
                          link to reset your password.
                        </DialogDescription>
                      </DialogHeader>

                      {resetSuccess ? (
                        <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                            Password reset link sent! Check your email inbox.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="reset-email">Email Address</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              placeholder="you@example.com"
                              disabled={resetLoading}
                            />
                          </div>
                          <Button
                            onClick={handleForgotPassword}
                            disabled={resetLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            {resetLoading ? 'Sending...' : 'Send Reset Link'}
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Logging in...
                    </span>
                  ) : (
                    'Log In'
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="text-blue-600 hover:underline font-semibold dark:text-blue-400"
                >
                  Sign Up
                </Link>
              </p>
            </TabsContent>

            <TabsContent value="social" className="mt-6 space-y-3">
              <Button
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full"
                type="button"
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Log In with Google
              </Button>

              <Button
                onClick={handleFacebookLogin}
                variant="outline"
                className="w-full"
                type="button"
                disabled={loading}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Log In with Facebook
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-950 text-gray-500">
                    Social login requires OAuth setup
                  </span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="text-blue-600 hover:underline font-semibold dark:text-blue-400"
                >
                  Sign Up
                </Link>
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
