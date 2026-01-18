'use client';

import { useState, useMemo } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface FormErrors {
  fullName?: string | null;
  email?: string | null;
  password?: string | null;
  confirmPassword?: string | null;
  terms?: string | null;
  general?: string | null;
}

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  /**
   * Password strength requirements checker
   */
  const passwordRequirements: PasswordRequirement[] = useMemo(
    () => [
      { label: 'At least 8 characters', met: formData.password.length >= 8 },
      {
        label: 'Contains uppercase letter',
        met: /[A-Z]/.test(formData.password),
      },
      {
        label: 'Contains lowercase letter',
        met: /[a-z]/.test(formData.password),
      },
      { label: 'Contains a number', met: /\d/.test(formData.password) },
      {
        label: 'Contains special character',
        met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
      },
    ],
    [formData.password]
  );

  /**
   * Calculate password strength percentage
   */
  const passwordStrength = useMemo(() => {
    const metCount = passwordRequirements.filter((req) => req.met).length;
    return (metCount / passwordRequirements.length) * 100;
  }, [passwordRequirements]);

  /**
   * Get password strength label and color
   */
  const getPasswordStrengthInfo = () => {
    if (passwordStrength === 0) return { label: '', color: 'bg-gray-200' };
    if (passwordStrength <= 40) return { label: 'Weak', color: 'bg-red-500' };
    if (passwordStrength <= 60)
      return { label: 'Fair', color: 'bg-orange-500' };
    if (passwordStrength <= 80)
      return { label: 'Good', color: 'bg-yellow-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  /**
   * Validates the signup form fields
   * @returns boolean indicating if validation passed
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength < 60) {
      newErrors.password = 'Please use a stronger password';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms acceptance validation
    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles email/password signup submission
   */
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all errors before signing up');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Call registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      toast.success('Account created successfully!', {
        description: 'Signing you in...',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });

      // Auto sign in after registration
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error(
          'Account created but sign in failed. Please try logging in.'
        );
        router.push('/login');
        return;
      }

      toast.success('Welcome to SkillSwap!', {
        description: 'You received 100 credits to get started.',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });

      // Navigate to dashboard
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Signup failed. Please try again.';
      console.error('Signup error:', error);
      toast.error(errorMessage);
      setErrors({
        general: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles Google OAuth signup
   */
  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      sessionStorage.setItem('skillswap_oauth_pending', 'google');
      await signIn('google', { callbackUrl: '/dashboard?login=success' });
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error('Failed to initiate Google signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles Facebook OAuth signup
   */
  const handleFacebookSignup = async () => {
    try {
      setLoading(true);
      sessionStorage.setItem('skillswap_oauth_pending', 'facebook');
      await signIn('facebook', { callbackUrl: '/dashboard?login=success' });
    } catch (error) {
      console.error('Facebook signup error:', error);
      toast.error('Failed to initiate Facebook signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strengthInfo = getPasswordStrengthInfo();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Join SkillSwap and start learning today
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
              <TabsTrigger value="social">Social Signup</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-6">
              <form onSubmit={handleEmailSignup} className="space-y-4">
                {/* Full Name Field */}
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (errors.fullName) {
                        setErrors({ ...errors, fullName: null });
                      }
                    }}
                    placeholder="Sunil Perera"
                    className={errors.fullName ? 'border-red-500' : ''}
                    disabled={loading}
                    autoComplete="name"
                  />
                  {errors.fullName && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Email Field */}
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

                {/* Password Field */}
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
                      placeholder="••••••••"
                      className={
                        errors.password ? 'border-red-500 pr-10' : 'pr-10'
                      }
                      disabled={loading}
                      autoComplete="new-password"
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

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Password strength</span>
                        <span
                          className={`font-medium ${
                            passwordStrength <= 40
                              ? 'text-red-500'
                              : passwordStrength <= 60
                              ? 'text-orange-500'
                              : passwordStrength <= 80
                              ? 'text-yellow-600'
                              : 'text-green-500'
                          }`}
                        >
                          {strengthInfo.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                      <ul className="grid grid-cols-1 gap-1 text-xs">
                        {passwordRequirements.map((req, index) => (
                          <li key={index} className="flex items-center gap-1.5">
                            {req.met ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <X className="h-3 w-3 text-gray-400" />
                            )}
                            <span
                              className={
                                req.met
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-500'
                              }
                            >
                              {req.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {errors.password && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        });
                        if (errors.confirmPassword) {
                          setErrors({ ...errors, confirmPassword: null });
                        }
                      }}
                      placeholder="••••••••"
                      className={
                        errors.confirmPassword
                          ? 'border-red-500 pr-10'
                          : 'pr-10'
                      }
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword &&
                    formData.password === formData.confirmPassword && (
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Passwords match
                      </p>
                    )}
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => {
                        setAcceptedTerms(checked as boolean);
                        if (errors.terms) {
                          setErrors({ ...errors, terms: null });
                        }
                      }}
                      disabled={loading}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm font-normal cursor-pointer leading-tight"
                    >
                      I agree to the{' '}
                      <Link
                        href="/terms"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                  {errors.terms && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.terms}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-blue-600 hover:underline font-semibold dark:text-blue-400"
                >
                  Log In
                </Link>
              </p>
            </TabsContent>

            <TabsContent value="social" className="mt-6 space-y-3">
              <Button
                onClick={handleGoogleSignup}
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
                Sign Up with Google
              </Button>

              <Button
                onClick={handleFacebookSignup}
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
                Sign Up with Facebook
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-950 text-gray-500">
                    Social signup requires OAuth setup
                  </span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-blue-600 hover:underline font-semibold dark:text-blue-400"
                >
                  Log In
                </Link>
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
