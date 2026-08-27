import RoleDetailPage from "../[roleId]/page";

export default function NewRolePage() {
  const newParams = Promise.resolve({ roleId: "new" });
  return <RoleDetailPage params={newParams} />;
}
