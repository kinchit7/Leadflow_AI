---
name: charts
description: Data visualization with recharts. Use when creating charts, graphs, dashboards, analytics displays, or any data visualization.
---

# Charts

This skill contains all patterns for creating data visualizations using recharts.

---

## Core Import

```typescript
import {
  // Chart types
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  ComposedChart,
  RadarChart,
  
  // Chart elements
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  
  // Axes and grid
  XAxis,
  YAxis,
  CartesianGrid,
  
  // Interactive elements
  Tooltip,
  Legend,
  
  // Container (REQUIRED)
  ResponsiveContainer,
  
  // Reference elements
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
```

---

## Critical Rule

**Every chart MUST be wrapped in ResponsiveContainer:**

```typescript
// ✅ CORRECT
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    {/* chart content */}
  </BarChart>
</ResponsiveContainer>

// ❌ WRONG - chart won't render properly
<BarChart data={data}>
  {/* chart content */}
</BarChart>
```

---

## Bar Chart

### Basic Bar Chart

```typescript
const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 500 },
  { name: 'Jun', value: 700 },
];

const BasicBarChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis 
        dataKey="name" 
        tick={{ fill: 'hsl(var(--muted-foreground))' }}
        axisLine={{ stroke: 'hsl(var(--border))' }}
      />
      <YAxis 
        tick={{ fill: 'hsl(var(--muted-foreground))' }}
        axisLine={{ stroke: 'hsl(var(--border))' }}
      />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px'
        }}
      />
      <Legend />
      <Bar 
        dataKey="value" 
        fill="hsl(var(--primary))" 
        radius={[4, 4, 0, 0]}
      />
    </BarChart>
  </ResponsiveContainer>
);
```

### Grouped Bar Chart

```typescript
const data = [
  { name: 'Q1', sales: 4000, revenue: 2400 },
  { name: 'Q2', sales: 3000, revenue: 1398 },
  { name: 'Q3', sales: 2000, revenue: 9800 },
  { name: 'Q4', sales: 2780, revenue: 3908 },
];

const GroupedBarChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px'
        }}
      />
      <Legend />
      <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);
```

### Stacked Bar Chart

```typescript
const StackedBarChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <Tooltip />
      <Legend />
      <Bar dataKey="sales" stackId="a" fill="hsl(var(--primary))" />
      <Bar dataKey="revenue" stackId="a" fill="hsl(var(--secondary))" />
    </BarChart>
  </ResponsiveContainer>
);
```

---

## Line Chart

### Basic Line Chart

```typescript
const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 500 },
];

const BasicLineChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px'
        }}
      />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="value" 
        stroke="hsl(var(--primary))" 
        strokeWidth={2}
        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
        activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
      />
    </LineChart>
  </ResponsiveContainer>
);
```

### Multi-Line Chart

```typescript
const data = [
  { name: 'Jan', current: 4000, previous: 2400 },
  { name: 'Feb', current: 3000, previous: 1398 },
  { name: 'Mar', current: 2000, previous: 9800 },
  { name: 'Apr', current: 2780, previous: 3908 },
];

const MultiLineChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <Tooltip />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="current" 
        stroke="hsl(var(--primary))" 
        strokeWidth={2}
        name="This Year"
      />
      <Line 
        type="monotone" 
        dataKey="previous" 
        stroke="hsl(var(--muted-foreground))" 
        strokeWidth={2}
        strokeDasharray="5 5"
        name="Last Year"
      />
    </LineChart>
  </ResponsiveContainer>
);
```

---

## Area Chart

### Basic Area Chart

```typescript
const BasicAreaChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <Tooltip />
      <Area 
        type="monotone" 
        dataKey="value" 
        stroke="hsl(var(--primary))" 
        fill="hsl(var(--primary) / 0.2)"
        strokeWidth={2}
      />
    </AreaChart>
  </ResponsiveContainer>
);
```

### Gradient Area Chart

```typescript
const GradientAreaChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
      <Tooltip />
      <Area 
        type="monotone" 
        dataKey="value" 
        stroke="hsl(var(--primary))" 
        fill="url(#colorValue)"
        strokeWidth={2}
      />
    </AreaChart>
  </ResponsiveContainer>
);
```

---

## Pie Chart

### Basic Pie Chart

```typescript
const data = [
  { name: 'Desktop', value: 400 },
  { name: 'Mobile', value: 300 },
  { name: 'Tablet', value: 200 },
  { name: 'Other', value: 100 },
];

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
];

const BasicPieChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        outerRadius={100}
        dataKey="value"
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);
```

### Donut Chart

```typescript
const DonutChart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={100}
        dataKey="value"
        label
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);
```

---

## Styling

### Using Tailwind CSS Variables

```typescript
// Primary color
fill="hsl(var(--primary))"
stroke="hsl(var(--primary))"

// With opacity
fill="hsl(var(--primary) / 0.2)"

// Secondary color
fill="hsl(var(--secondary))"

// Muted/gray
fill="hsl(var(--muted))"
stroke="hsl(var(--muted-foreground))"

// Border color for grid
stroke="hsl(var(--border))"

// Background for tooltip
backgroundColor: 'hsl(var(--card))'
```

### Common Color Palette

```typescript
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(220 70% 50%)',    // Blue
  'hsl(160 60% 45%)',    // Green
  'hsl(30 80% 55%)',     // Orange
  'hsl(280 65% 60%)',    // Purple
];
```

### Tooltip Styling

```typescript
<Tooltip 
  contentStyle={{ 
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
  }}
  labelStyle={{ 
    color: 'hsl(var(--foreground))',
    fontWeight: 600
  }}
  itemStyle={{ 
    color: 'hsl(var(--muted-foreground))'
  }}
/>
```

---

## Data Formatting

### Number Formatting

```typescript
// Currency on Y-axis
<YAxis 
  tickFormatter={(value) => `$${value.toLocaleString()}`}
/>

// Percentage
<YAxis 
  tickFormatter={(value) => `${value}%`}
/>

// Compact numbers (1K, 1M)
<YAxis 
  tickFormatter={(value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value;
  }}
/>
```

### Date Formatting

```typescript
import moment from 'moment';

// Format dates on X-axis
<XAxis 
  dataKey="date" 
  tickFormatter={(value) => moment(value).format('MMM D')} 
/>

// Full date format
<XAxis 
  dataKey="date" 
  tickFormatter={(value) => moment(value).format('MMM D, YYYY')} 
/>
```

### Custom Tooltip Content

```typescript
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="font-heading text-sm mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="font-paragraph text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

<Tooltip content={<CustomTooltip />} />
```

---

## Chart Container Pattern

### Card Wrapper

```typescript
const ChartCard = ({ title, description, children }) => (
  <div className="rounded-lg border bg-card p-6">
    <div className="mb-6">
      <h3 className="font-heading text-lg">{title}</h3>
      {description && (
        <p className="font-paragraph text-sm text-muted-foreground mt-1">
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
);

// Usage
<ChartCard 
  title="Monthly Revenue" 
  description="Revenue trends over the past 6 months"
>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      {/* ... */}
    </BarChart>
  </ResponsiveContainer>
</ChartCard>
```

---

## Responsive Height Options

```typescript
// Fixed height (most common)
<ResponsiveContainer width="100%" height={300}>

// Aspect ratio (maintains proportion)
<ResponsiveContainer width="100%" aspect={16/9}>

// Percentage of parent (parent must have explicit height)
<ResponsiveContainer width="100%" height="100%">

// Different heights per breakpoint (use container)
<div className="h-[250px] md:h-[350px] lg:h-[400px]">
  <ResponsiveContainer width="100%" height="100%">
```

---

## Complete Dashboard Example

```typescript
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 4000, expenses: 2400 },
  { month: 'Feb', revenue: 3000, expenses: 1398 },
  { month: 'Mar', revenue: 5000, expenses: 2800 },
  { month: 'Apr', revenue: 4780, expenses: 3908 },
  { month: 'May', revenue: 5890, expenses: 4800 },
  { month: 'Jun', revenue: 6390, expenses: 3800 },
];

const trafficData = [
  { name: 'Direct', value: 400 },
  { name: 'Organic', value: 300 },
  { name: 'Referral', value: 200 },
  { name: 'Social', value: 100 },
];

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(220 70% 50%)',
  'hsl(160 60% 45%)',
];

const Dashboard = () => {
  return (
    <div className="max-w-[100rem] mx-auto px-4 py-16">
      <h1 className="font-heading text-3xl md:text-4xl mb-8">Analytics Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Revenue', value: '$45,231', change: '+20.1%' },
          { label: 'Subscriptions', value: '2,350', change: '+15.3%' },
          { label: 'Active Users', value: '12,234', change: '+5.2%' },
          { label: 'Conversion Rate', value: '3.2%', change: '+1.1%' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg border bg-card p-6"
          >
            <p className="font-paragraph text-sm text-muted-foreground">{stat.label}</p>
            <p className="font-heading text-2xl mt-2">{stat.value}</p>
            <p className="font-paragraph text-sm text-green-500 mt-1">{stat.change}</p>
          </motion.div>
        ))}
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg border bg-card p-6"
        >
          <h3 className="font-heading text-lg mb-6">Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        
        {/* Traffic Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg border bg-card p-6"
        >
          <h3 className="font-heading text-lg mb-6">Traffic Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={trafficData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {trafficData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
        
        {/* Trend Line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-lg border bg-card p-6 lg:col-span-2"
        >
          <h3 className="font-heading text-lg mb-6">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
```
