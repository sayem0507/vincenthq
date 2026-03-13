export type TeamMember = {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  monthlyXp: number;
  badges: string[];
  sales: number;
  posts: number;
  outreach: number;
};

export const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Alex Hunter',
    avatar: 'https://i.pravatar.cc/150?u=alex',
    xp: 1450,
    monthlyXp: 4200,
    badges: ['🔥 The Furnace', '🦈 Apex Predator'],
    sales: 4,
    posts: 42,
    outreach: 120,
  },
  {
    id: '2',
    name: 'Jordan Lee',
    avatar: 'https://i.pravatar.cc/150?u=jordan',
    xp: 1200,
    monthlyXp: 3800,
    badges: ['🎣 The Hook'],
    sales: 3,
    posts: 38,
    outreach: 150,
  },
  {
    id: '3',
    name: 'Taylor Swift',
    avatar: 'https://i.pravatar.cc/150?u=taylor',
    xp: 850,
    monthlyXp: 2100,
    badges: [],
    sales: 1,
    posts: 25,
    outreach: 80,
  },
];

export const dailyStats = {
  views: 0,
  viewsTarget: 2400,
  telegramJoins: 0,
  telegramTarget: 25,
  sales: 0,
  salesTarget: 1,
  daysRemaining: 60,
  totalRevenue: 0,
  goalRevenue: 1000,
};
