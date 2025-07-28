import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  
  // Student routes
  route("create-request", "routes/create-request.tsx"),
  route("my-requests", "routes/my-requests.tsx"),
  route("browse-equipment", "routes/browse-equipment.tsx"),
  
  // Lecturer/Admin routes
  route("pending-requests", "routes/pending-requests.tsx"),
  route("manage-equipment", "routes/manage-equipment.tsx"),
  route("equipment-tracking", "routes/equipment-tracking.tsx"),
] satisfies RouteConfig;
