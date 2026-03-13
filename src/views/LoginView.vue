<script >
export default {
  name: 'Login',
  data() {
    return {
      form: {
        email: "",
        password: "",
      },
      errors: {},
    };
  },
  methods: {
    ValidaitonGmail() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!this.form.email) {
        this.errors.email = "សូមបញ្ចូលអ៊ីមែល";
      } else if (!emailRegex.test(this.form.email)) {
        this.errors.email = "អ៊ីមែលមិនត្រឹមត្រូវ";
      } else {
        this.errors.email = "";
      }

    },
    ValidaitonPassword() {
      if (!this.form.password) {
        this.errors.password = "សូមបញ្ចូលពាក្យសម្ងាត់";
      } else if (this.form.password.length < 8) {
        this.errors.password = "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួ";
      } else {
        this.errors.password = "";
      }
    },
    submitForm(e) {

      e.preventDefault();
      this.ValidaitonGmail();
      this.ValidaitonPassword();
      

      if (!Object.values(this.errors).some(error => error)) {
        alert("Form submitted!");
      }

    },
  },
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-screen">
    <div class="md:w-180 h-fit bg-white border-2 border-[#D9D9D9] rounded-[20px] ">
      <h1 class="text-[36px] font-bold flex justify-center mt-5">ចូលគណនី</h1>
      <div>
        <form @submit="submitForm" class="m-10 flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="email">អ៊ីមែល</label>
            <input
              @blur="ValidaitonGmail"
              id="email"
              name="email"
              placeholder="បញ្ចូលអ៊ីមែលរបស់អ្នក"
              v-model="form.email"
              class="border-2 border-[#D9D9D9] rounded-[10px] p-2 focus:outline-none focus:ring-2 focus:ring-[#D1E9FF]"
            />
            <p class="text-red-500 text-sm">{{ errors.email }}</p>
          </div>

          <div class="flex flex-col gap-2">
            <label for="password">ពាក្យសម្ងាត់</label>
            <input
              @blur="ValidaitonPassword"
              type="password"
              id="password"
              name="password"
              placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក"
              v-model="form.password"
              class="border-2 border-[#D9D9D9] rounded-[10px] p-2 focus:outline-none focus:ring-2 focus:ring-[#D1E9FF]"
            />
            <p class="text-red-500 text-sm">{{ errors.password }}</p>
          </div>
          <span class="text-[#1570EF] flex justify-end">ភ្លេចពាក្យសម្ងាត់</span>
          <button type="submit" class="w-fill h-13 text-white rounded-lg bg-[#1B68FF]">
            ចូលគណនី
          </button>
          <div class="flex items-center">
            <hr class="grow border-t border-gray-300" />
            <span class="mx-4 text-gray-500">ឬ</span>
            <hr class="grow border-t border-gray-300" />
          </div>
          <button
            type="button"
            class="w-fill h-10 border-2 border-[#D9D9D9] text-black rounded-lg bg-white"
          >
            Continue with Google
          </button>

          <div class="flex justify-center gap-2">
            <span class="text-[#98A2B3]">មិនទាន់មានគណនី?</span>
            <RouterLink to="/register" class="text-[#1570EF]">ចុះឈ្មោះ</RouterLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
