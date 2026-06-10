import { redirect } from "next/navigation";

// Корень редиректит на дефолтную локаль (ru)
export default function RootPage() {
  redirect("/ru");
}
