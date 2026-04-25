import React from "react";
import { SafeAreaView, Text } from "react-native";
import CategoryDonut from "@/components/charts/CategoryDonut";
import { useInsights } from "@/api/queries/useInsights";

export default function CategoriesScreen() {
 const { data } = useInsights();
 return (
 <SafeAreaView style={{ flex: 1, backgroundColor: "#131313", padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "700", marginBottom: 12 }}>Categories</Text>
 <CategoryDonut data={data?.category_breakdown} />
 </SafeAreaView>
 );
}
