<script>
export default {
  name: "Register",
     data() {
    return {
      form: {
        firstName: "",
        lastName: "",
        gender: "",
        dob: "",
        email: "",
        phone: "",
        skill: "",
        studentId: "",
        password: "",
        confirmPassword: "",
      },
      errors: {}
    }
  },

  methods: {
    submitForm(e) {
      e.preventDefault();
      this.errors = {};

      if (!this.form.firstName) {
        this.errors.firstName = "សូមបញ្ចូលនាមត្រកូល";
      }

      if (!this.form.lastName) {
        this.errors.lastName = "សូមបញ្ចូលនាមខ្លួន";
      }

      if (!this.form.gender) {
        this.errors.gender = "សូមជ្រើសរើសភេទ";
      }

      if (!this.form.email) {
        this.errors.email = "សូមបញ្ចូលអ៊ីមែល";
      }

      if (!this.form.phone) {
        this.errors.phone = "សូមបញ្ចូលលេខទូរស័ព្ទ";
      }

      if (!this.form.password) {
        this.errors.password = "សូមបញ្ចូលពាក្យសម្ងាត់";
      }

      if (this.form.password !== this.form.confirmPassword) {
        this.errors.confirmPassword = "ពាក្យសម្ងាត់មិនដូចគ្នា";
      }
      if (!this.form.studentId) {
        this.errors.studentId = "សូមបញ្ចូលលេខសម្គាល់និស្សិត";
      }
      if (!this.form.skill) {
        this.errors.skill = "សូមបញ្ចូលជំនាញ";
      }

      if (Object.keys(this.errors).length === 0) {
        alert("Form submitted!");
      }
    }
}
}
</script>

<template>
<div class="min-h-screen bg-gray-100 flex items-center justify-center p-6 ">

  <div class="w-180 h-fit bg-white border-2 border-[#D9D9D9] rounded-[20px] p-10">

    <h1 class="text-[36px] font-bold flex justify-center mt-5">
      បង្កើតគណនី
    </h1>

    <form class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label >នាមត្រកូល</label>
        <input v-model="form.firstName" type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 " placeholder="នាមត្រកូលរបស់អ្នក">
        <p class="text-red-500 text-sm">{{ errors.firstName }}</p>
      </div>

      <div>
        <label >នាមខ្លួន</label>
        <input v-model="form.lastName" type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="នាមខ្លួនរបស់អ្នក">
        <p class="text-red-500 text-sm">{{ errors.lastName }}</p>
      </div>

      <div>
        <label >ភេទ</label>
        <select v-model="form.gender" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>ជ្រើសរើស</option>
          <option>ប្រុស</option>
          <option>ស្រី</option>
        </select>
        <p class="text-red-500 text-sm">{{ errors.gender }}</p>
      </div>

      <div>
        <label >ថ្ងៃ ខែ ឆ្នាំកំណើត</label>
        <input v-model="form.dob" type="date" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <p class="text-red-500 text-sm">{{ errors.dob }}</p>
      </div>

      <div>
        <label >អ៊ីមែល</label>
        <input v-model="form.email" type="email" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលអ៊ីមែលរបស់អ្នក">
        <p class="text-red-500 text-sm">{{ errors.email }}</p>
      </div>


      <div>
        <label >លេខទូរស័ព្ទ</label>
        <input v-model="form.phone" type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលលេខទូរស័ព្ទរបស់អ្នក">
        <p class="text-red-500 text-sm">{{ errors.phone }}</p>
      </div>


      <div>
        <label >ជំនាញ</label>
        <input v-model="form.skill" type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលជំនាញរបស់អ្នក">
        <p class="text-red-500 text-sm" >{{ errors.skill }}</p>
      </div>


      <div>
        <label >លេខសម្គាល់និស្សិត</label>
        <input v-model="form.studentId" type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលលេខសម្គាល់និស្សិតរបស់អ្នក">
        <p class="text-red-500 text-sm" >{{ errors.studentId }}</p>
      </div>

      <div>
        <label >ពាក្យសម្ងាត់</label>
        <input v-model="form.password" type="password" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក">
        <p class="text-red-500 text-sm" >{{ errors.password }}</p>
      </div>

      <div>
        <label >បញ្ជាក់ពាក្យសម្ងាត់</label>
        <input v-model="form.confirmPassword" type="password" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក">
        <p class="text-red-500 text-sm" >{{ errors.confirmPassword }}</p>
      </div>


      <div class="md:col-span-2" >
        <button class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition" @click="submitForm">
          ចុះឈ្មោះ
        </button>
      </div>

    </form>
    <div class="flex items-center my-3">
            <hr class="grow border-t border-gray-300" />
            <span class="mx-4 text-gray-500">ឬ</span>
            <hr class="grow border-t border-gray-300" />
          </div>
          <button
            type="button"
            class="w-full h-13 border-2 border-[#D9D9D9] text-black rounded-lg bg-white"
          >
            Continue with Google
          </button>
    <div class="flex justify-center gap-2 mt-5">
      <span>មានគណនីរួចហើយ?</span>
      <RouterLink to="/login" class="text-blue-600 ml-2">ចូលគណនី</RouterLink>
    </div>
  </div>

</div>
</template>