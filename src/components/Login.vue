<script lang="ts">
export default {
  name: 'Login',
}

</script>

<template>
  <div class="flex flex-col items-center justify-center h-screen">
    <div class="w-150 h-137.5 bg-white border-2 border-[#D9D9D9] rounded-[20px]">
      <h1 class="text-[36px] font-bold flex justify-center mt-5">ចូលគណនី</h1>
      <div>
        <form action="submit" class="m-10 flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="email">អ៊ីមែល</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="បញ្ចូលអ៊ីមែលរបស់អ្នក"
              required
              class="border-2 border-[#D9D9D9] rounded-[10px] p-2 focus:outline-none focus:ring-2 focus:ring-[#D1E9FF]"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="password">ពាក្យសម្ងាត់</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក"
              required
              class="border-2 border-[#D9D9D9] rounded-[10px] p-2 focus:outline-none focus:ring-2 focus:ring-[#D1E9FF]"
            />
          </div>
          <span class="text-[#1570EF] flex justify-end">ភ្លេចពាក្យសម្ងាត់</span>
          <button type="submit" class="w-fill h-13 text-white rounded-lg bg-[#1B68FF]">
            ចូលគណនី
          </button>
          <div class="flex items-center">
            <hr class="grow border-t border-gray-300" />
            <span class="mx-4 text-gray-500">or</span>
            <hr class="grow border-t border-gray-300" />
          </div>
          <button
            type="button"
            class="w-fill h-13 border-2 border-[#D9D9D9] text-black rounded-lg bg-white"
          >
            Continue with Google
          </button>

          <div class="flex justify-center gap-2">
            <span class="text-[#98A2B3]">មិនទាន់មានគណនី?</span>
            <a href="/register" class="text-[#1570EF]">ចុះឈ្មោះ</a>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
