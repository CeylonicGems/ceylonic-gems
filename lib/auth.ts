import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types";
export async function getCurrentProfile(){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {user:null,profile:null};
  const {data:profile}=await supabase.from("profiles").select("*").eq("id",user.id).maybeSingle();
  return {user:{id:user.id,email:user.email},profile:(profile as Profile|null)??null};
}
export async function requireUser(){const result=await getCurrentProfile(); if(!result.user||!result.profile) redirect("/login"); return {user:result.user,profile:result.profile};}
export async function requireRole(roles:UserRole[]){const result=await requireUser(); if(!roles.includes(result.profile.role)) redirect("/dashboard"); return result;}
