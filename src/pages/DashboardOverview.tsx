import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderTree, Package, Star, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

const DashboardOverview = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalProducts: 0,
    featuredProducts: 0,
    topProducts: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [categoriesResult, productsResult, featuredResult, topResult] = await Promise.all([
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_featured", true),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("top_products", true),
      ]);

      setStats({
        totalCategories: categoriesResult.count || 0,
        totalProducts: productsResult.count || 0,
        featuredProducts: featuredResult.count || 0,
        topProducts: topResult.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: t("overview.totalCategories"),
      value: stats.totalCategories,
      icon: FolderTree,
      color: "text-primary",
    },
    {
      title: t("overview.totalProducts"),
      value: stats.totalProducts,
      icon: Package,
      color: "text-accent",
    },
    {
      title: t("overview.featuredProducts"),
      value: stats.featuredProducts,
      icon: Star,
      color: "text-yellow-600",
    },
    {
      title: t("overview.topProducts"),
      value: stats.topProducts,
      icon: TrendingUp,
      color: "text-green-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("overview.title")}</h2>
        <p className="text-muted-foreground">
          {t("overview.welcome")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.color}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardOverview;
