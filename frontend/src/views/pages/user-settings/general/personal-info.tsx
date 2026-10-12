'use client'

// React Imports
import { useEffect, useRef, useState } from 'react'

// Third-party Imports
import { ImageIcon, Trash2Icon, UploadCloudIcon } from 'lucide-react'
import { UpdateUserDataFormSchema, updateUserDataSchema } from '@/lib/schemas/user-configs'
import { Controller, useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'

// Component Imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { Field, FieldLabel } from '@/components/ui/field'
import { toast } from 'sonner'
import ImageCropperModal from '@/components/modals/ImageCropperModal'
import { Spinner } from '@/components/ui/spinner'

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const PersonalInfo = () => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const form = useForm<UpdateUserDataFormSchema>({
    resolver: zodResolver(updateUserDataSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      image: undefined,
    },
  })

  useEffect(() => {
    form.register('image')
  }, [form])

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    } else {
      if (session?.user.name) {
        form.setValue("name", session.user.name)
      }
      if (session?.user.image) {
        setPreview(session.user.image)
        form.setValue("image", session.user.image)
      }
    }
  }, [session, isPending, form, router])

  const onSubmit = async (values: UpdateUserDataFormSchema) => {
    let imageToUpdate: string | null | undefined = undefined

    if (values.image instanceof File) {
      imageToUpdate = await fileToBase64(values.image)
    } else if (values.image === null) {
      imageToUpdate = null
    }

    const { data, error } = await authClient.updateUser({
      name: values.name,
      ...(imageToUpdate !== undefined ? { image: imageToUpdate } : {}),
    }, {
      onSuccess: () => {
        toast.success("Informações atualizadas com sucesso!");
      },
      onError: (ctx) => {
        toast.error("Erro ao atualizar informações");
        console.log("Deu erro ao atualizar informações:", ctx.error)
      }
    })
  }

  const openPicker = () => inputRef.current?.click()

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    form.setValue('image', selectedFile, { shouldValidate: true, shouldDirty: true })
    const isValid = await form.trigger('image')
    if (!isValid) {
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setCropImageSrc(objectUrl)
  }

  const handleCropComplete = (croppedFile: File, croppedUrl: string) => {
    setFile(croppedFile)
    setPreview(croppedUrl)
    form.setValue('image', croppedFile, { shouldValidate: true, shouldDirty: true })
    setCropImageSrc(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleCropCancel = () => {
    setCropImageSrc(null)
    if (inputRef.current) inputRef.current.value = ''
    form.setValue('image', file ?? session?.user.image ?? undefined, { shouldValidate: true })
  }

  const remove = () => {
    setFile(null)
    setPreview(null)
    form.setValue('image', null, { shouldValidate: true, shouldDirty: true })
    if (inputRef.current) inputRef.current.value = ''
  }

  if (isPending) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Spinner className='size-8' />
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-10 w-full'>
      {cropImageSrc && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          aspectRatio={1}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      <div className='space-y-6 w-full'>
        <form className='mx-auto' onSubmit={form.handleSubmit(onSubmit)}>
          <div className='mb-6 w-full space-y-2'>
            <Label>Foto de Perfil</Label>
            <div className='flex items-center gap-4'>
              <div
                role='button'
                tabIndex={0}
                aria-label='Upload sua foto'
                onClick={openPicker}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openPicker()
                  }
                }}
                className='flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed hover:opacity-95'
              >
                {preview ? (
                  <img src={preview} alt='Foto de perfil' className='h-full w-full object-cover' />
                ) : (
                  <ImageIcon />
                )}
              </div>

              <div className='flex items-center gap-2'>
                <input
                  ref={inputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={onFileChange}
                />
                <Button type='button' variant='outline' onClick={openPicker} className='flex items-center gap-2 cursor-pointer'>
                  <UploadCloudIcon />
                  Carregar foto de perfil
                </Button>
                <Button type='button' variant='ghost' onClick={remove} disabled={!file && !preview} className='text-destructive! cursor-pointer'>
                  <Trash2Icon />
                </Button>
              </div>
            </div>
            <p className='text-muted-foreground text-sm'>Certifique-se de que a imagem não ultrapasse 7MB.</p>
            {form.formState.errors.image && (
              <p className='text-sm text-destructive'>{form.formState.errors.image.message}</p>
            )}
          </div>
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
            <Controller
              name='name'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field className='gap-2'>
                  <FieldLabel htmlFor='name' className='leading-5'>
                    Nome
                  </FieldLabel>
                  <Input
                    {...field}
                    id='name'
                    placeholder='Digite seu nome'
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className='text-sm text-destructive'>{fieldState.error.message}</p>
                  )}
                </Field>
              )}
            />
          </div>
          <div className='flex justify-end'>
            <Button type='submit' className='max-sm:w-full' disabled={form.formState.isSubmitting || !form.formState.isValid}>
              {form.formState.isSubmitting ? (
                <span className='flex items-center gap-2'>
                  <Spinner className='size-4' />
                </span>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PersonalInfo
