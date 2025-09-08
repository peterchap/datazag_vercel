// app/page.tsx

// No need for 'use client' or any hooks!

export default function HomePage() {
  // This content will only be seen by users if they somehow land here,
  // but the middleware will redirect them away immediately.
  // It can be a simple marketing page or just null.
  return (
    <div>
      <h1>Welcome to Datazag</h1>
      <p>Please log in to continue.</p>
    </div>
  );
}
