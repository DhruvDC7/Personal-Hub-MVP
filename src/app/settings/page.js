import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';

export default function SettingsPage() {
  const settings = {
    currency: 'INR (Indian Rupee)',
    timezone: 'Asia/Kolkata (IST)',
    user: 'demo-user',
  };

  return (
    <div>
      <PageHeader title="Settings" />
      
      <Card>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Account Information</h3>
            <p className="mt-1 text-sm text-gray-500">Your personal account settings</p>
          </div>
          
          <div className="border-t border-gray-200">
            <dl className="divide-y divide-gray-200">
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">User ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {settings.user}
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {settings.user}@example.com
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Preferences</h3>
            <p className="mt-1 text-sm text-gray-500">Customize your application preferences</p>
          </div>
          
          <div className="border-t border-gray-200">
            <dl className="divide-y divide-gray-200">
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Currency</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {settings.currency}
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Timezone</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {settings.timezone}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      <Card className="mt-6 bg-yellow-50 border-yellow-200">
        <div className="space-y-4">
          <h3 className="text-lg font-medium leading-6 text-yellow-800">Coming Soon</h3>
          <div className="text-sm text-yellow-700">
            <p className="mb-2">
              We're working on adding more settings and customization options, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>User authentication</li>
              <li>Email notifications</li>
              <li>Custom categories</li>
              <li>Export data</li>
              <li>Dark mode</li>
            </ul>
            <p className="mt-2">
              Stay tuned for updates!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
