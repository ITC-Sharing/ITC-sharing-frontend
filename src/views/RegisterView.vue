<script>
export default {
  name: "Register",

  data() {
    return {
      form: {
        firstName: "",
        lastName: "",
        skill: "",
        email: "",
        password: "",
        confirmPassword: ""
      },
      errors: {}
    }
  },

  methods: {

    validateFirstName() {
      const nameRegex = /^[A-Za-z\u1780-\u17FF\s]+$/;

      if (!this.form.firstName) {
        this.errors.firstName = "សូមបញ្ចូលនាមត្រកូល";
      } else if (!nameRegex.test(this.form.firstName)) {
        this.errors.firstName = "មិនអាចមានលេខ ឬ សញ្ញាពិសេសបានទេ";
      } else {
        this.errors.firstName = "";
      }
    },

    validateLastName() {
      const nameRegex = /^[A-Za-z\u1780-\u17FF\s]+$/;

      if (!this.form.lastName) {
        this.errors.lastName = "សូមបញ្ចូលនាមខ្លួន";
      } else if (!nameRegex.test(this.form.lastName)) {
        this.errors.lastName = "មិនអាចមានលេខ ឬ សញ្ញាពិសេសបានទេ";
      } else {
        this.errors.lastName = "";
      }
    },

    validateEmail() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!this.form.email) {
        this.errors.email = "សូមបញ្ចូលអ៊ីមែល";
      } else if (!emailRegex.test(this.form.email)) {
        this.errors.email = "អ៊ីមែលមិនត្រឹមត្រូវ";
      } else {
        this.errors.email = "";
      }
    },

    validatePassword() {
      if (!this.form.password) {
        this.errors.password = "សូមបញ្ចូលពាក្យសម្ងាត់";
      } else if (this.form.password.length < 8) {
        this.errors.password = "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួ";
      } else {
        this.errors.password = "";
      }
    },

    validateConfirmPassword() {
      if (!this.form.confirmPassword) {
        this.errors.confirmPassword = "សូមបញ្ចូលបញ្ជាក់ពាក្យសម្ងាត់";
      } else if (this.form.password !== this.form.confirmPassword) {
        this.errors.confirmPassword = "ពាក្យសម្ងាត់មិនដូចគ្នា";
      } else {
        this.errors.confirmPassword = "";
      }
    },

    validateSkill() {
      if (!this.form.skill || this.form.skill === "ជ្រើសរើស") {
        this.errors.skill = "សូមជ្រើសរើសជំនាញ";
      } else {
        this.errors.skill = "";
      }
    },

    submitForm(e) {
      e.preventDefault();

      this.validateFirstName();
      this.validateLastName();
      this.validateEmail();
      this.validatePassword();
      this.validateConfirmPassword();
      this.validateSkill();

      if (!Object.values(this.errors).some(error => error)) {
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

    <form @submit="submitForm" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label >នាមត្រកូល</label>
        <input 
        @blur="validateFirstName" 
        v-model="form.firstName" 
        type="text" 
        class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 " placeholder="នាមត្រកូលរបស់អ្នក">
        <p class="text-red-500 text-sm">{{ errors.firstName }}</p>
      </div>

      <div>
        <label >នាមខ្លួន</label>
        <input 
        @blur="validateLastName" 
        v-model="form.lastName" 
        type="text" 
        class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="នាមខ្លួនរបស់អ្នក">
        <p class="text-red-500 text-sm">{{ errors.lastName }}</p>
      </div>

      <div>
        <label >ជំនាញ</label>
        <select v-model="form.skill" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 " @blur="validateSkill" >
          <option disabled="">ជ្រើសរើស</option>
          <option>GIC</option>
          <option>AMS</option>
          <option>Web Development</option>
          <option>Mobile Development</option>
          <option>Data Science</option>
        </select>
        <p class="text-red-500 text-sm">{{ errors.skill }}</p>
      </div>

      <div>
        <label >អ៊ីមែល</label>
        <input 
        @blur="validateEmail" 
        v-model="form.email" 
        
        class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលអ៊ីមែលរបស់អ្នក">
        <p class="text-red-500 text-sm">{{ errors.email }}</p>
      </div>
 

      <div>
        <label >ពាក្យសម្ងាត់</label>
        <input 
        @blur="validatePassword" 
        v-model="form.password" 
        type="password" 
        class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក">
        <p class="text-red-500 text-sm" >{{ errors.password }}</p>
      </div>

      <div>
        <label >បញ្ជាក់ពាក្យសម្ងាត់</label>
        <input 
        @blur="validateConfirmPassword" 
        v-model="form.confirmPassword" 
        type="password" 
        class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក">
        <p class="text-red-500 text-sm" >{{ errors.confirmPassword }}</p>
      </div>


      <div class="md:col-span-2" >
        <button class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition" type="submit">
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