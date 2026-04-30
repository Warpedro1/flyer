import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 pb-28 text-center md:pb-8">
      <div className="rounded-full bg-gray-100 p-6">
        <Bell className="h-12 w-12 text-gray-400" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-gray-900">Notificações</h1>
      <p className="mt-2 max-w-sm text-gray-500">
        Ainda não tens alertas. Quando houver novidades sobre eventos e amigos, aparecem aqui.
      </p>
    </div>
  );
}
