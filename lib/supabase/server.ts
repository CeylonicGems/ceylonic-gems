import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) throw new Error("Supabase public environment variables are missing.");
  const store=await cookies();
  return createServerClient(url,key,{cookies:{
    getAll(){return store.getAll();},
    setAll(list){try{list.forEach(({name,value,options})=>store.set(name,value,options));}catch{}}
  }});
}
