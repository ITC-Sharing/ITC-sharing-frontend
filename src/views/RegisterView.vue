<script>
export default {
  name: "Register",
  methods: {
    submitForm() {
      // Handle form submission logic here
      alert("Form submitted!");
    },
}
}


</script>

<template>
<div class="min-h-screen bg-gray-100 flex items-center justify-center p-6">

  <div class="w-180 h-190 bg-white border-2 border-[#D9D9D9] rounded-[20px] p-10">

    <h1 class="text-[36px] font-bold flex justify-center mt-5">
      បង្កើតគណនី
    </h1>

    <form class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label >នាមត្រកូល</label>
        <input type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 " placeholder="នាមត្រកូលរបស់អ្នក">
      </div>

      <div>
        <label >នាមខ្លួន</label>
        <input type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="នាមខ្លួនរបស់អ្នក">
      </div>

      <div>
        <label >ភេទ</label>
        <select class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>ជ្រើសរើស</option>
          <option>ប្រុស</option>
          <option>ស្រី</option>
        </select>
      </div>

      <div>
        <label >ថ្ងៃ ខែ ឆ្នាំកំណើត</label>
        <input type="date" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
      </div>

      <div>
        <label >អ៊ីមែល</label>
        <input type="email" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលអ៊ីមែលរបស់អ្នក">
      </div>


      <div>
        <label >លេខទូរស័ព្ទ</label>
        <input type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលលេខទូរស័ព្ទរបស់អ្នក">
      </div>


      <div>
        <label >ជំនាញ</label>
        <input type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលជំនាញរបស់អ្នក">
      </div>


      <div>
        <label >លេខសម្គាល់និស្សិត</label>
        <input type="text" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលលេខសម្គាល់និស្សិតរបស់អ្នក">
      </div>

      <div>
        <label >ពាក្យសម្ងាត់</label>
        <input type="password" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក">
      </div>

      <div>
        <label >បញ្ជាក់ពាក្យសម្ងាត់</label>
        <input type="password" class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក">
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