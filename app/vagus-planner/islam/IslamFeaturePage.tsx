import Link from 'next/link';
import Layout from '@/app/components/Layout';

type IslamFeaturePageProps = {
  icon: string;
  title: string;
  description: string;
};

export default function IslamFeaturePage({ icon, title, description }: IslamFeaturePageProps) {
  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto pt-24">
        <Link
          href="/vagus-planner/islam"
          className="text-sm text-purple-600 hover:text-purple-700 font-medium mb-6 inline-block"
        >
          ← Back to Islamic Features
        </Link>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-5xl mb-4">{icon}</div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </Layout>
  );
}
