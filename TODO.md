# Project TODO List

- [ ] Implement analytics to track total visits and user engagement.
  - Integrate a service like Google Analytics or Supabase Edge Functions for tracking.
  - Replace mock data for "Total Visits" on the dashboard with real data from the tracking service.
- [ ] Build a fully functional, conversational chatbot for the "Contact Support" feature.
  - This is partially complete. The current chatbot can answer from an FAQ and search for properties.
  - A potential enhancement is to give it more tools or a more persistent memory.
- [ ] Refactor data fetching to use Next.js Server Components instead of client-side `useEffect` for better performance.
- [ ] Move client-side filtering and sorting in the UserTable to backend Supabase queries to improve scalability.
- [ ] Enhance security by preventing Super Admins from deleting other Super Admins in the 'deleteUser' server action.
- [ ] Add necessary indexes to Supabase to optimize database query performance.
- [X] Prevent deactivated or pending users from logging in.
- [X] Connect the availability chart to system settings.
- [X] Fix the Agent Resources page (`/app/agent/resources`) to correctly fetch and display data based on the logged-in agent's access tier.
