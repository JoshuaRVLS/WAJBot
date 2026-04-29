import { SessionsDashboard } from '@/components/dashboard/sessions-dashboard';
import { commands } from '@/src/commands/index';

const commandSummaries = commands.map((command) => ({
  name: command.name,
  description: command.description,
  usage: command.usage ?? null,
}));

export default function HomePage() {
  return <SessionsDashboard commands={commandSummaries} />;
}
