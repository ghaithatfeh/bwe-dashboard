import { LayoutDashboard, FolderTree, Package, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/i18n";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    titleKey: "nav.overview",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    titleKey: "nav.categories",
    url: "/dashboard/categories",
    icon: FolderTree,
  },
  {
    titleKey: "nav.products",
    url: "/dashboard/products",
    icon: Package,
  },
  {
    titleKey: "nav.orders",
    url: "/dashboard/orders",
    icon: ShoppingCart,
  },
  {
    titleKey: "nav.users",
    url: "/dashboard/users",
    icon: Users,
  },
  {
    titleKey: "nav.admins",
    url: "/dashboard/admins",
    icon: ShieldCheck,
  },
] as const;

export function DashboardSidebar() {
  const { t } = useTranslation();
  const { dir } = useLanguage();

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.management")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
