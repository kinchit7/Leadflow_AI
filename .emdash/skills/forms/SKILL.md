---
name: forms
description: Form handling with react-hook-form. Use when creating forms, handling user input, implementing validation, or building contact/submission forms.
---

# Forms

This skill contains all patterns for creating forms, handling user input, and implementing validation using react-hook-form and shadcn/ui components.

---

## Core Setup

```typescript
import { useForm } from 'react-hook-form';

type FormData = {
  name: string;
  email: string;
  message: string;
};

const MyForm = () => {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    // Handle form submission
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
};
```

---

## Basic Form Pattern

```typescript
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ContactFormData = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

const ContactForm = () => {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    reset 
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    // Process form data
    console.log('Form submitted:', data);
    
    // Reset form after successful submission
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name field */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input 
          id="name"
          placeholder="Your name"
          {...register('name', { 
            required: 'Name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' }
          })}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Phone field (optional) */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input 
          id="phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          {...register('phone')}
        />
      </div>

      {/* Message field */}
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea 
          id="message"
          placeholder="Your message..."
          rows={5}
          {...register('message', { 
            required: 'Message is required',
            minLength: { value: 10, message: 'Message must be at least 10 characters' }
          })}
          className={errors.message ? 'border-destructive' : ''}
        />
        {errors.message && (
          <p className="text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  );
};

export default ContactForm;
```

---

## shadcn/ui Form Components

For more complex forms with better accessibility, use the Form components:

```typescript
import { useForm } from 'react-hook-form';
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription,
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type ProfileFormData = {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
};

const ProfileForm = () => {
  const form = useForm<ProfileFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      bio: ''
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <FormField
          control={form.control}
          name="firstName"
          rules={{ required: 'First name is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="John" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          rules={{ required: 'Last name is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input placeholder="Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          rules={{ 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormDescription>
                We'll never share your email with anyone else.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell us about yourself..."
                  rows={4}
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Brief description for your profile (optional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>
    </Form>
  );
};
```

---

## Validation Rules

### Required Field

```typescript
{...register('field', { required: 'This field is required' })}
```

### Min/Max Length

```typescript
{...register('field', { 
  minLength: { value: 3, message: 'Minimum 3 characters' },
  maxLength: { value: 100, message: 'Maximum 100 characters' }
})}
```

### Pattern (Regex)

```typescript
// Email
{...register('email', { 
  pattern: {
    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
    message: 'Invalid email address'
  }
})}

// Phone
{...register('phone', { 
  pattern: {
    value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
    message: 'Invalid phone number'
  }
})}

// URL
{...register('website', { 
  pattern: {
    value: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
    message: 'Invalid URL'
  }
})}
```

### Custom Validation

```typescript
{...register('password', { 
  validate: {
    hasUppercase: (value) => /[A-Z]/.test(value) || 'Must contain uppercase letter',
    hasLowercase: (value) => /[a-z]/.test(value) || 'Must contain lowercase letter',
    hasNumber: (value) => /[0-9]/.test(value) || 'Must contain number',
    minLength: (value) => value.length >= 8 || 'Must be at least 8 characters'
  }
})}
```

### Conditional Validation

```typescript
const watchPaymentMethod = watch('paymentMethod');

{...register('cardNumber', { 
  required: watchPaymentMethod === 'card' ? 'Card number is required' : false
})}
```

---

## Input Components

### Text Input

```typescript
<Input 
  type="text"
  placeholder="Enter text..."
  {...register('fieldName')}
/>
```

### Email Input

```typescript
<Input 
  type="email"
  placeholder="you@example.com"
  {...register('email', { 
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email'
    }
  })}
/>
```

### Password Input

```typescript
<Input 
  type="password"
  placeholder="••••••••"
  {...register('password', { required: 'Password is required' })}
/>
```

### Textarea

```typescript
<Textarea 
  placeholder="Your message..."
  rows={5}
  {...register('message')}
/>
```

### Select

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<FormField
  control={form.control}
  name="category"
  rules={{ required: 'Please select a category' }}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Category</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="general">General Inquiry</SelectItem>
          <SelectItem value="support">Support</SelectItem>
          <SelectItem value="sales">Sales</SelectItem>
          <SelectItem value="feedback">Feedback</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Checkbox

```typescript
import { Checkbox } from '@/components/ui/checkbox';

<FormField
  control={form.control}
  name="terms"
  rules={{ required: 'You must accept the terms' }}
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>
          I accept the terms and conditions
        </FormLabel>
        <FormMessage />
      </div>
    </FormItem>
  )}
/>
```

### Radio Group

```typescript
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

<FormField
  control={form.control}
  name="plan"
  rules={{ required: 'Please select a plan' }}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Select Plan</FormLabel>
      <FormControl>
        <RadioGroup
          onValueChange={field.onChange}
          defaultValue={field.value}
          className="flex flex-col space-y-2"
        >
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="free" />
            </FormControl>
            <FormLabel className="font-normal">Free</FormLabel>
          </FormItem>
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="pro" />
            </FormControl>
            <FormLabel className="font-normal">Pro - $9/month</FormLabel>
          </FormItem>
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="enterprise" />
            </FormControl>
            <FormLabel className="font-normal">Enterprise - Contact us</FormLabel>
          </FormItem>
        </RadioGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Switch

```typescript
import { Switch } from '@/components/ui/switch';

<FormField
  control={form.control}
  name="notifications"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel>Email Notifications</FormLabel>
        <FormDescription>
          Receive emails about your account activity.
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

---

## Form Submission with CMS

```typescript
import { BaseCrudService } from '@/integrations';

const ContactForm = () => {
  const form = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    // Save to CMS collection
    await BaseCrudService.create('contact-submissions', {
      ...data,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      status: 'new'
    });
    
    // Reset form
    form.reset();
    
    // Show success message (you'd typically use toast)
    alert('Thank you! Your message has been sent.');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* fields */}
      </form>
    </Form>
  );
};
```

---

## Error Handling

**Do NOT use try-catch in form submissions** - errors should bubble up so they can be fixed.

The only exception is for optimistic updates where you need to revert:

```typescript
const onSubmit = async (data: FormData) => {
  // Direct submission - no try-catch needed
  await BaseCrudService.create('submissions', data);
  form.reset();
};
```

---

## Form Utilities

### Reset Form

```typescript
const { reset } = useForm<FormData>();

// Reset to empty values
reset();

// Reset to specific values
reset({ 
  name: 'John', 
  email: 'john@example.com' 
});

// Reset after submission
const onSubmit = async (data: FormData) => {
  await submitData(data);
  reset();
};
```

### Watch Values

```typescript
const { watch } = useForm<FormData>();

// Watch single field
const nameValue = watch('name');

// Watch multiple fields
const [name, email] = watch(['name', 'email']);

// Watch all fields
const allValues = watch();

// Use watched value for conditional rendering
{watch('showOptional') && (
  <Input {...register('optionalField')} />
)}
```

### Set Values Programmatically

```typescript
const { setValue } = useForm<FormData>();

// Set single value
setValue('name', 'John Doe');

// Set with validation
setValue('email', 'john@example.com', { 
  shouldValidate: true,
  shouldDirty: true 
});
```

### Form State

```typescript
const { formState } = useForm<FormData>();

// Check if form is submitting
formState.isSubmitting

// Check if form is valid
formState.isValid

// Check if form has been modified
formState.isDirty

// Check specific field state
formState.touchedFields.email
formState.dirtyFields.email
```

---

## Complete Contact Page Example

```typescript
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { 
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BaseCrudService } from '@/integrations';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const ContactPage = () => {
  const form = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    await BaseCrudService.create('contact-submissions', {
      ...data,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString()
    });
    form.reset();
  };

  return (
    <div className="max-w-[100rem] mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="font-heading text-4xl md:text-5xl mb-4">Get in Touch</h1>
        <p className="font-paragraph text-lg text-muted-foreground max-w-2xl mx-auto">
          Have a question or want to work together? Fill out the form below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Contact Info */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4"
          >
            <div className="p-3 bg-primary/10 rounded-lg">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-lg mb-1">Email</h3>
              <p className="font-paragraph text-muted-foreground">hello@example.com</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-start gap-4"
          >
            <div className="p-3 bg-primary/10 rounded-lg">
              <Phone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-lg mb-1">Phone</h3>
              <p className="font-paragraph text-muted-foreground">+1 (555) 123-4567</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-4"
          >
            <div className="p-3 bg-primary/10 rounded-lg">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-lg mb-1">Address</h3>
              <p className="font-paragraph text-muted-foreground">
                123 Business Ave<br />
                San Francisco, CA 94102
              </p>
            </div>
          </motion.div>
        </div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  rules={{ 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email'
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  rules={{ required: 'Subject is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="How can we help?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                rules={{ 
                  required: 'Message is required',
                  minLength: { value: 10, message: 'Message must be at least 10 characters' }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us more about your inquiry..."
                        rows={6}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                size="lg"
                disabled={form.formState.isSubmitting}
                className="w-full md:w-auto"
              >
                {form.formState.isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactPage;
```
