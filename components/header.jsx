{session?.user && profile?.is_admin && (
  <>
    <Link href="/admin" className="ml-4">Admin</Link>
    <Link href="/admin/clean-images" className="ml-4">Clean Images</Link>
  </>
)}
