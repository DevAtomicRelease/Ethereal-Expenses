import React from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, ExpenseFormData } from "@/utils/validation";
import { CATEGORY_LIST } from "@/utils/categories";
import Button from "@/components/ui/Button";

type ExpenseFormProps = {
 onSubmit: (data: ExpenseFormData) => void;
 loading: boolean;
 defaultValues?: Partial<ExpenseFormData>;
};

export default function ExpenseForm({ onSubmit, loading, defaultValues }: ExpenseFormProps) {
 const { control, handleSubmit, formState: { errors } } = useForm({
 resolver: zodResolver(expenseSchema),
 defaultValues: { amount: 0, category: "food", timestamp: new Date().toISOString(), ...defaultValues },
 });

 return (
 <ScrollView style={{ padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, marginBottom: 6 }}>Amount (INR)</Text>
 <Controller control={control} name="amount"
 render={({ field: { onChange, value } }) => (
 <TextInput style={{ backgroundColor: "#1E293B", color: "#F8FAFC", padding: 14, borderRadius: 12, fontSize: 18, marginBottom: 16 }}
 keyboardType="numeric" placeholder="0" placeholderTextColor="#64748B"
 value={value ? String(value) : ""} onChangeText={(t) => onChange(parseFloat(t) || 0)} />
 )} />
 {errors.amount && <Text style={{ color: "#EF4444", fontSize: 12, marginBottom: 8 }}>{String(errors.amount.message)}</Text>}

 <Text style={{ color: "#F8FAFC", fontSize: 14, marginBottom: 6, marginTop: 8 }}>Category</Text>
 <Controller control={control} name="category"
 render={({ field: { onChange, value } }) => (
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
 {CATEGORY_LIST.map((cat) => (
 <Button key={cat} title={cat.replace("_", " ")} variant={value === cat ? "primary" : "secondary"}
 onPress={() => onChange(cat)} style={{ marginRight: 8, paddingVertical: 8, paddingHorizontal: 14 }} />
 ))}
 </ScrollView>
 )} />

 <Text style={{ color: "#F8FAFC", fontSize: 14, marginBottom: 6 }}>Description (optional)</Text>
 <Controller control={control} name="description"
 render={({ field: { onChange, value } }) => (
 <TextInput style={{ backgroundColor: "#1E293B", color: "#F8FAFC", padding: 14, borderRadius: 12, marginBottom: 20 }}
 placeholder="What was this for?" placeholderTextColor="#64748B"
 value={value || ""} onChangeText={onChange} />
 )} />

 <Button title={loading ? "Saving..." : "Save Expense"} onPress={handleSubmit(onSubmit)} loading={loading} />
 </ScrollView>
 );
}
