import React, { useState } from "react";
import { SafeAreaView, View, Text } from "react-native";
import { useRouter } from "expo-router";
import ExpenseForm from "@/components/expense/ExpenseForm";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAddExpense } from "@/api/mutations/useAddExpense";

export default function QuickAddScreen() {
 const [count, setCount] = useState(0);
 const { mutate, isPending } = useAddExpense();
 const router = useRouter();

 return (
 <SafeAreaView style={{ flex: 1, backgroundColor: "#131313" }}>
 <View style={{ padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "700" }}>Quick Add</Text>
 <Text style={{ color: "#94A3B8", marginTop: 8, marginBottom: 12 }}>Add 5 expenses to get started ({count}/5)</Text>
 <ProgressBar progress={(count / 5) * 100} color="#10B981" />
 </View>
 <ExpenseForm loading={isPending} onSubmit={(data) => {
 mutate({ ...data, category: data.category, timestamp: data.timestamp }, {
 onSuccess: () => {
 const next = count + 1;
 setCount(next);
 if (next >= 5) router.replace("/(tabs)/home");
 },
 });
 }} />
 </SafeAreaView>
 );
}
