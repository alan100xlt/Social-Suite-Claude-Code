// Typed sample data matching Nivo's expected shapes for each chart type.
// Values are realistic social media analytics numbers.

export const sampleBarData = [
  { country: 'United States', '2010': 310, '2020': 331 },
  { country: 'Russia', '2010': 143, '2020': 146 },
  { country: 'Ukraine', '2010': 45, '2020': 44 },
  { country: 'India', '2010': 1210, '2020': 1380 },
];

export const sampleLineData = [
  { id: 'Views', data: [
    { x: 'Jan', y: 4200 }, { x: 'Feb', y: 5800 }, { x: 'Mar', y: 5100 },
    { x: 'Apr', y: 7400 }, { x: 'May', y: 6800 }, { x: 'Jun', y: 9200 },
  ]},
  { id: 'Engagement', data: [
    { x: 'Jan', y: 1800 }, { x: 'Feb', y: 2400 }, { x: 'Mar', y: 2100 },
    { x: 'Apr', y: 3200 }, { x: 'May', y: 2900 }, { x: 'Jun', y: 4100 },
  ]},
];

export const samplePieData = [
  { id: 'LinkedIn', value: 45, label: 'LinkedIn' },
  { id: 'Twitter', value: 30, label: 'Twitter' },
  { id: 'Instagram', value: 15, label: 'Instagram' },
  { id: 'TikTok', value: 10, label: 'TikTok' },
];

export const sampleHeatmapData = [
  { id: 'Mon', data: [{ x: '6am', y: 12 }, { x: '9am', y: 45 }, { x: '12pm', y: 78 }, { x: '3pm', y: 56 }, { x: '6pm', y: 89 }, { x: '9pm', y: 34 }] },
  { id: 'Tue', data: [{ x: '6am', y: 8 }, { x: '9am', y: 52 }, { x: '12pm', y: 65 }, { x: '3pm', y: 71 }, { x: '6pm', y: 92 }, { x: '9pm', y: 28 }] },
  { id: 'Wed', data: [{ x: '6am', y: 15 }, { x: '9am', y: 38 }, { x: '12pm', y: 82 }, { x: '3pm', y: 49 }, { x: '6pm', y: 76 }, { x: '9pm', y: 41 }] },
  { id: 'Thu', data: [{ x: '6am', y: 11 }, { x: '9am', y: 61 }, { x: '12pm', y: 73 }, { x: '3pm', y: 58 }, { x: '6pm', y: 85 }, { x: '9pm', y: 37 }] },
  { id: 'Fri', data: [{ x: '6am', y: 9 }, { x: '9am', y: 42 }, { x: '12pm', y: 68 }, { x: '3pm', y: 45 }, { x: '6pm', y: 71 }, { x: '9pm', y: 52 }] },
];

export const sampleRadarData = [
  { metric: 'Engagement', LinkedIn: 85, Twitter: 72, Instagram: 91 },
  { metric: 'Reach', LinkedIn: 68, Twitter: 89, Instagram: 76 },
  { metric: 'Growth', LinkedIn: 45, Twitter: 62, Instagram: 83 },
  { metric: 'Consistency', LinkedIn: 92, Twitter: 55, Instagram: 71 },
  { metric: 'Virality', LinkedIn: 38, Twitter: 81, Instagram: 94 },
];

export const sampleTreemapData = {
  name: 'content',
  children: [
    { name: 'Articles', children: [
      { name: 'How-to', value: 450 }, { name: 'News', value: 320 }, { name: 'Opinion', value: 180 },
    ]},
    { name: 'Videos', children: [
      { name: 'Short-form', value: 380 }, { name: 'Long-form', value: 220 },
    ]},
    { name: 'Images', children: [
      { name: 'Infographics', value: 290 }, { name: 'Photos', value: 160 },
    ]},
  ],
};

export const sampleSunburstData = sampleTreemapData;

export const sampleBumpData = [
  { id: 'LinkedIn', data: [{ x: 'Jan', y: 1 }, { x: 'Feb', y: 2 }, { x: 'Mar', y: 1 }, { x: 'Apr', y: 1 }, { x: 'May', y: 2 }, { x: 'Jun', y: 1 }] },
  { id: 'Twitter', data: [{ x: 'Jan', y: 2 }, { x: 'Feb', y: 1 }, { x: 'Mar', y: 3 }, { x: 'Apr', y: 2 }, { x: 'May', y: 1 }, { x: 'Jun', y: 3 }] },
  { id: 'Instagram', data: [{ x: 'Jan', y: 3 }, { x: 'Feb', y: 3 }, { x: 'Mar', y: 2 }, { x: 'Apr', y: 3 }, { x: 'May', y: 3 }, { x: 'Jun', y: 2 }] },
];

export const sampleFunnelData = [
  { id: 'Impressions', value: 15000, label: 'Impressions' },
  { id: 'Clicks', value: 4200, label: 'Clicks' },
  { id: 'Signups', value: 1100, label: 'Signups' },
  { id: 'Conversions', value: 320, label: 'Conversions' },
];

export const sampleScatterData = [
  { id: 'Posts', data: [
    { x: 120, y: 4.2 }, { x: 340, y: 6.1 }, { x: 560, y: 3.8 },
    { x: 780, y: 8.2 }, { x: 210, y: 5.1 }, { x: 450, y: 7.4 },
    { x: 680, y: 2.9 }, { x: 890, y: 9.1 }, { x: 150, y: 3.5 },
    { x: 520, y: 6.8 },
  ]},
];

export const sampleSparklineData = [
  { id: 'trend', data: [
    { x: '1', y: 42 }, { x: '2', y: 58 }, { x: '3', y: 51 },
    { x: '4', y: 74 }, { x: '5', y: 68 }, { x: '6', y: 92 },
    { x: '7', y: 87 }, { x: '8', y: 103 },
  ]},
];

export const sampleHorizontalBarData = [
  { platform: 'LinkedIn', Views: 45000 },
  { platform: 'Instagram', Views: 32000 },
  { platform: 'Twitter', Views: 28000 },
  { platform: 'TikTok', Views: 19000 },
  { platform: 'Facebook', Views: 12000 },
];
