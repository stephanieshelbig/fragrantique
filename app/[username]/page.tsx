import Boutique from '@/components/Boutique';
export default function UserPage({ params }: { params: { username: string } }) { return <Boutique username={params.username} /> }
